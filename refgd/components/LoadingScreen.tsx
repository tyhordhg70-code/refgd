"use client";

import { useEffect, useState } from "react";

/**
 * LoadingScreen — full-screen cinematic boot overlay.
 *
 * Why this exists
 * ───────────────
 * On a fresh page load, the browser is doing a LOT of work in the
 * first ~1.5 seconds:
 *   • Decoding hero/path-card images
 *   • Loading + swapping web fonts
 *   • Promoting transformed elements to their own GPU layers (the
 *     first time a layer is needed it has to be rasterised and
 *     uploaded to the GPU — this is the single biggest cause of
 *     "first scroll feels janky")
 *   • JIT-compiling framer-motion code paths
 *   • Initialising the Three.js / WebGL galaxy context (desktop)
 *
 * If the user can scroll DURING that warm-up window, every
 * scroll-triggered animation pays the layer-creation tax in real
 * time and the page feels laggy. By holding everyone at this
 * overlay for ~2.5 seconds while the React tree mounts and warms
 * up underneath, that tax is paid up-front. When the overlay
 * fades, every layer/font/image is already on the GPU and the
 * subsequent scrolling/animation is buttery.
 *
 * The component:
 *   • Mounts at the very top of <body>, fixed full-screen, z 9999
 *   • Locks body scroll while visible
 *   • Waits for ALL of: document.fonts.ready, window 'load',
 *     two rAF cycles, AND a minimum 2400 ms hold
 *   • Animates a smooth deterministic progress bar so the user
 *     sees clear forward motion the entire time
 *   • Fades out over 800 ms once ready, then fully unmounts so
 *     it costs nothing for the rest of the session
 *
 * It is a CLIENT component so it ships in the same chunk as the
 * page — no extra network round-trip required to remove it.
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

  useEffect(() => {
    // Lock body scroll while the overlay is visible so the user
    // can't start interacting with a half-warm tree.
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const startTime = performance.now();
    const MIN_DURATION = 2400;
    let rafId = 0;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const elapsed = performance.now() - startTime;
      const t = Math.min(0.95, elapsed / MIN_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = Math.round(eased * 95);
      setProgress(pct);
      if (pct < 25) setPhase(PHASES[0]);
      else if (pct < 55) setPhase(PHASES[1]);
      else if (pct < 80) setPhase(PHASES[2]);
      else setPhase(PHASES[3]);
      if (t < 0.95) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // Wait for everything that meaningfully affects first-paint perf
    const fontsReady: Promise<unknown> =
      typeof document !== "undefined" && document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();

    const windowLoaded = new Promise<void>((r) => {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", () => r(), { once: true });
    });

    const minStall = new Promise<void>((r) => setTimeout(r, MIN_DURATION));

    // Two rAF cycles guarantee the first layout + paint of the
    // mounted React tree have flushed.
    const firstPaint = new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );

    let timerA = 0;
    let timerB = 0;

    Promise.all([fontsReady, windowLoaded, minStall, firstPaint]).then(() => {
      if (cancelled) return;
      cancelAnimationFrame(rafId);
      setProgress(100);
      setPhase(PHASES[4]);
      timerA = window.setTimeout(() => setVisible(false), 240);
      timerB = window.setTimeout(() => {
        setRemoved(true);
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      }, 1100);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerA);
      clearTimeout(timerB);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  if (removed) return null;

  // 36 deterministic CSS-twinkle stars across the overlay so the
  // boot screen has cosmic character even at < 100 ms.
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
        // Promote to its own GPU layer so its fade-out is composited
        // independently of the page underneath.
        willChange: "opacity",
        transform: "translateZ(0)",
      }}
    >
      {/* Ambient nebula glow */}
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

      {/* Twinkle starfield */}
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

      {/* Center cluster */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: 440,
          padding: "0 24px",
        }}
      >
        {/* RG seal — pulse-glow CSS keyframe (already defined in
            globals.css as pulseGlowViolet) provides the breathing
            ring without any JS. */}
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
            // Reserve vertical space so the bar doesn't shift when
            // the phase string changes length.
            minHeight: "1em",
          }}
        >
          {phase}
        </p>

        {/* Progress bar */}
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
