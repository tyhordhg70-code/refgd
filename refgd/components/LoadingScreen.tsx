"use client";

import { useEffect, useRef, useState } from "react";

/**
 * LoadingScreen — full-screen cinematic boot overlay with a REAL
 * progress tracker.
 *
 * Why this exists
 * ───────────────
 * On a fresh page load, the browser is doing a LOT of work in the
 * first ~1.5 seconds: image decoding, font swap, GPU layer
 * promotion, framer-motion JIT, WebGL init. If the user can scroll
 * during that window, every animation pays the layer-creation tax
 * in real time and feels janky. Holding the user behind this
 * overlay until the page is *actually* warm fixes that.
 *
 * The progress tracker is a TRUE measurement, not a fake timer:
 *
 *   • IMAGES — every <img> currently in the DOM contributes 1 unit;
 *     each fires its load event when the browser has decoded it
 *   • FONTS — every FontFace registered with document.fonts is
 *     1 unit; resolves when its load promise settles
 *   • WINDOW — the 'load' event (everything in <head>, all CSS
 *     and stylesheet @font-face declarations) is 1 weighted block
 *   • PAINT — two rAF cycles after everything else, to guarantee
 *     the React tree behind the overlay has fully painted
 *   • STAGE — a soft minimum 1.5 s so the overlay never flashes
 *     by faster than the user can read it
 *
 * The bar value is the WEIGHTED REAL ratio of all the above. It
 * physically cannot reach 100 % until every signal resolves. A
 * very gentle time-based floor is added so the bar always shows
 * forward motion (never sits at 0 % for 800 ms while the first
 * batch of images is still in-flight) — but that floor caps at
 * 88 %, never at 100 %. 100 % only ever fires when the actual
 * Promise.all() of all real signals resolves.
 *
 * Once truly ready: pause briefly at 100 %, fade overlay over
 * 800 ms, then unmount. Subsequent scrolls have no overlay cost.
 */

const PHASES = [
  "Initialising cosmos",
  "Loading paths",
  "Aligning constellations",
  "Tuning the journey",
  "Ready",
];

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(PHASES[0]);
  const [visible, setVisible] = useState(true);
  const [removed, setRemoved] = useState(false);
  // Keep last reported value so the bar never goes backwards
  const lastShownRef = useRef(0);

  useEffect(() => {
    // Lock body so the user can't start scrolling on a half-warm tree
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const startTime = performance.now();
    const MIN_DURATION = 1500;
    let cancelled = false;
    let rafId = 0;
    let timerA = 0;
    let timerB = 0;

    // ── REAL trackers ──────────────────────────────────────────────
    const state = {
      imgsTotal: 0,
      imgsLoaded: 0,
      fontsTotal: 0,
      fontsLoaded: 0,
      windowLoaded: document.readyState === "complete",
      firstPaintDone: false,
      minStallDone: false,
      everythingResolved: false,
    };

    function commitProgress() {
      if (cancelled) return;
      // Components of real progress (each is a 0..1 ratio)
      const imgPct =
        state.imgsTotal === 0 ? 1 : state.imgsLoaded / state.imgsTotal;
      const fontPct =
        state.fontsTotal === 0 ? 1 : state.fontsLoaded / state.fontsTotal;
      const winPct = state.windowLoaded ? 1 : 0;
      const paintPct = state.firstPaintDone ? 1 : 0;
      const stallPct = state.minStallDone ? 1 : 0;

      // Weighted real composite — images dominate because they're
      // the slowest per-asset wait for first-paint perf.
      const real =
        imgPct * 0.45 +
        fontPct * 0.20 +
        winPct * 0.15 +
        paintPct * 0.10 +
        stallPct * 0.10;

      // Soft time floor so the bar shows motion even if the first
      // batch of resources hasn't reported yet. Caps at 88 % — only
      // the everythingResolved Promise.all() can take it to 100 %.
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / 1200);
      const eased = 1 - Math.pow(1 - t, 3);
      const floor = Math.min(0.88, eased * 0.78);

      const candidate = Math.max(real, floor);
      const cap = state.everythingResolved ? 1.0 : 0.95;
      const display = Math.min(cap, candidate);

      // Monotonic — never go backwards
      const pct = Math.max(lastShownRef.current, Math.round(display * 100));
      lastShownRef.current = pct;
      setProgress(pct);

      if (pct < 25) setPhase(PHASES[0]);
      else if (pct < 55) setPhase(PHASES[1]);
      else if (pct < 80) setPhase(PHASES[2]);
      else if (pct < 100) setPhase(PHASES[3]);
      else setPhase(PHASES[4]);
    }

    function tick() {
      if (cancelled) return;
      commitProgress();
      if (!state.everythingResolved) rafId = requestAnimationFrame(tick);
    }

    // Start the rAF loop immediately so the bar shows life
    rafId = requestAnimationFrame(tick);

    // ── Discover trackable resources after the first paint so the
    //    React tree behind us has had a chance to mount its <img>s.
    const discoverTimer = window.setTimeout(() => {
      if (cancelled) return;
      const imgs = Array.from(document.querySelectorAll("img"));
      state.imgsTotal = imgs.length;
      imgs.forEach((img) => {
        if (img.complete && img.naturalHeight > 0) {
          state.imgsLoaded++;
        } else {
          const onDone = () => {
            state.imgsLoaded++;
            commitProgress();
          };
          img.addEventListener("load", onDone, { once: true });
          img.addEventListener("error", onDone, { once: true });
        }
      });
      // Some lazy-loaded images may never fire while `loading="lazy"`
      // and below the fold. We treat them as loaded after a short
      // grace window so they can't block the bar forever.
      window.setTimeout(() => {
        if (cancelled) return;
        const remaining = state.imgsTotal - state.imgsLoaded;
        if (remaining > 0) {
          state.imgsLoaded = state.imgsTotal;
          commitProgress();
        }
      }, 4500);
      commitProgress();
    }, 250);

    // ── Fonts: register every FontFace, resolve on each load ──
    if (typeof document !== "undefined" && document.fonts) {
      // Snapshot count after a short delay so late `<link rel=stylesheet>`
      // @font-face rules have had time to register.
      window.setTimeout(() => {
        if (cancelled) return;
        const all = Array.from(document.fonts as Iterable<FontFace>);
        state.fontsTotal = all.length || 1;
        all.forEach((f) => {
          if (f.status === "loaded") state.fontsLoaded++;
          else
            f.load()
              .then(() => {
                state.fontsLoaded++;
                commitProgress();
              })
              .catch(() => {
                state.fontsLoaded++;
                commitProgress();
              });
        });
        commitProgress();
      }, 100);
    }

    // ── Window load (CSS, fonts via @font-face, deferred scripts) ──
    const onWindowLoad = () => {
      state.windowLoaded = true;
      commitProgress();
    };
    if (document.readyState === "complete") {
      state.windowLoaded = true;
    } else {
      window.addEventListener("load", onWindowLoad, { once: true });
    }

    // ── Two rAF cycles after window load so we know the React tree
    //    has had a real layout + paint pass.
    const paintWaiter = new Promise<void>((resolve) => {
      const trigger = () => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            state.firstPaintDone = true;
            commitProgress();
            resolve();
          }),
        );
      };
      if (document.readyState === "complete") trigger();
      else window.addEventListener("load", trigger, { once: true });
    });

    // ── Min stall: never finish faster than the user can register
    //    that the overlay even appeared.
    const minStallPromise = new Promise<void>((r) =>
      window.setTimeout(() => {
        state.minStallDone = true;
        commitProgress();
        r();
      }, MIN_DURATION),
    );

    // ── Window load promise ──
    const windowLoadPromise = new Promise<void>((r) => {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", () => r(), { once: true });
    });

    // ── Fonts ready promise ──
    const fontsReadyPromise: Promise<unknown> =
      typeof document !== "undefined" && document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();

    // ── Scene-ready promise: any cinematic scene component
    //    (ChipScroll on the evade page, etc.) dispatches a
    //    `refgd:scene-ready` window event once its canvas/3D scene
    //    has actually painted its first frame. We wait for it here
    //    so the loading overlay never fades out exposing a blank
    //    canvas. If no such scene is on the current page (home,
    //    mentorships, etc.), the timeout below resolves immediately
    //    after a short grace window so it doesn't extend page loads
    //    that don't need it.
    const sceneReadyPromise = new Promise<void>((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        window.removeEventListener(
          "refgd:scene-ready",
          finish as EventListener,
        );
        resolve();
      };
      window.addEventListener("refgd:scene-ready", finish as EventListener, {
        once: true,
      });
      // Pages without a heavy scene should not be held back. Resolve
      // after 1500ms if no scene-ready fires, which still gives any
      // mounting scene a real chance to signal first.
      window.setTimeout(finish, 1500);
    });

    // ── Image promise: resolves when ALL images have either loaded
    //    or hit the 4.5 s grace fallback above ──
    const imagesPromise = new Promise<void>((resolve) => {
      const check = window.setInterval(() => {
        if (cancelled) {
          clearInterval(check);
          return;
        }
        if (
          state.imgsTotal > 0 &&
          state.imgsLoaded >= state.imgsTotal
        ) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      // Hard ceiling — never block beyond 6 s on images alone
      window.setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 6000);
    });

    Promise.all([
      fontsReadyPromise,
      windowLoadPromise,
      minStallPromise,
      paintWaiter,
      imagesPromise,
      sceneReadyPromise,
    ]).then(() => {
      if (cancelled) return;
      state.everythingResolved = true;
      // Final commit takes us from whatever real % we reached up to 100
      lastShownRef.current = 100;
      setProgress(100);
      setPhase(PHASES[4]);
      cancelAnimationFrame(rafId);

      timerA = window.setTimeout(() => setVisible(false), 280);
      timerB = window.setTimeout(() => {
        setRemoved(true);
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      }, 1100);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearTimeout(discoverTimer);
      clearTimeout(timerA);
      clearTimeout(timerB);
      window.removeEventListener("load", onWindowLoad);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  if (removed) return null;

  // Cosmic twinkle backdrop (deterministic, SSR-safe positions)
  const STARS = Array.from({ length: 36 }, (_, i) => {
    const left = (i * 67 + 13) % 100;
    const top = (i * 41 + 7) % 100;
    const size = 1 + (i % 3);
    const dur = 3 + (i % 5);
    const delay = (i % 7) * 0.45;
    const tint =
      i % 5 === 0 ? "rgba(255,225,140,0.95)"
      : i % 5 === 1 ? "rgba(167,139,250,0.95)"
      : i % 5 === 2 ? "rgba(103,232,249,0.9)"
      : i % 5 === 3 ? "rgba(244,114,182,0.85)"
      : "rgba(255,255,255,0.95)";
    return { left, top, size, dur, delay, tint };
  });

  return (
    <div
      aria-hidden={!visible}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(ellipse at 30% 30%, #1b1340 0%, #0a0c1a 55%, #000 100%)",
        opacity: visible ? 1 : 0,
        transition: "opacity 800ms cubic-bezier(0.65, 0, 0.35, 1)",
        pointerEvents: visible ? "auto" : "none",
        display: "grid",
        placeItems: "center",
        willChange: "opacity",
        transform: "translateZ(0)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 22% 28%, rgba(167,139,250,0.28), transparent 45%)," +
            "radial-gradient(circle at 78% 70%, rgba(34,211,238,0.22), transparent 50%)," +
            "radial-gradient(circle at 50% 100%, rgba(245,185,69,0.18), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {STARS.map((s, i) => (
          <span
            key={i}
            className="telegram-star"
            style={{
              position: "absolute",
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              background: s.tint,
              borderRadius: "50%",
              boxShadow: `0 0 ${s.size * 5}px ${s.tint}`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Spinning 3D wireframe accent — same family of shapes that
          drifts in the page background, so the loading screen visually
          previews the experience the user is about to get. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "calc(50% - 200px)",
          transform: "translate(-50%, -50%)",
          width: 110,
          height: 110,
          opacity: 0.55,
          perspective: "800px",
        }}
      >
        <div
          className="shape-gyro"
          style={{ width: "100%", height: "100%" }}
        >
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
          <div className="core" />
        </div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: 440,
          padding: "0 24px",
        }}
      >
        <div
          className="pulse-glow-violet"
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 104,
            height: 104,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,225,140,0.42), rgba(167,139,250,0.22) 55%, transparent 100%)",
            border: "1px solid rgba(255,225,140,0.35)",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', Geist, system-ui, sans-serif",
              fontWeight: 800,
              fontSize: 40,
              letterSpacing: "-0.04em",
              background:
                "linear-gradient(135deg, #ffe28a 0%, #ffffff 50%, #a78bfa 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
            }}
          >
            RG
          </div>
        </div>

        <h1
          style={{
            fontFamily: "'Space Grotesk', Geist, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.96)",
            margin: 0,
            marginBottom: 6,
            textShadow:
              "0 0 24px rgba(167,139,250,0.55), 0 0 48px rgba(255,225,140,0.18)",
          }}
        >
          RefundGod
        </h1>

        <p
          style={{
            fontFamily: "Geist, system-ui, sans-serif",
            fontSize: 11,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: "rgba(167,139,250,0.95)",
            margin: 0,
            marginBottom: 28,
            minHeight: "1em",
          }}
        >
          {phase}
        </p>

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 280,
            height: 2,
            margin: "0 auto",
            background: "rgba(255,255,255,0.10)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, #ffe28a, #a78bfa 50%, #67e8f9)",
              borderRadius: 2,
              boxShadow: "0 0 14px rgba(167,139,250,0.85)",
              transition: "width 260ms cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "width",
            }}
          />
        </div>

        <p
          style={{
            fontFamily: "Geist, system-ui, sans-serif",
            fontSize: 10,
            color: "rgba(255,255,255,0.55)",
            margin: 0,
            marginTop: 14,
            letterSpacing: "0.22em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {progress}%
        </p>
      </div>
    </div>
  );
}
