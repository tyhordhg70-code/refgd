"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import KineticText from "./KineticText";

/**
 * CosmicJourney — looping color-changing sphere hero.
 *
 * History: this hero was a ~23 MB Spline WebGL galaxy, then a 101-frame WebP
 * <canvas> sequence, then a one-shot pre-rendered cinematic clip. It now loops
 * the owner's "magic spheres" montage through a <video> element, with the page
 * chrome reacting to the sphere's changing color:
 *
 *   • The sphere clip LOOPS continuously while the hero is on screen.
 *   • A tiny hidden canvas samples the video a few times a second and takes a
 *     luminance-weighted average that ignores the black background and locks
 *     onto the vivid orb color. That color drives a single CSS variable
 *     (`--glow`) — no React re-renders — which tints an ambient glow behind the
 *     orb and the soft blurred screen edges.
 *   • The WHITE welcome text sits over a soft dark scrim + text-shadow so it
 *     stays legible no matter what color the sphere becomes.
 *   • Hand-off: the hero <-> #paths transition AUTO-COMMITS. On DESKTOP the
 *     lenis wheel/keyboard tween runs it; on MOBILE a velocity-gated native
 *     smooth-scroll commits by travel DIRECTION (down -> cards, up -> top) the
 *     instant the fling's momentum is nearly spent — a finger always cancels it.
 *   • iOS: the desktop colored edge/corner glow uses filter:blur + mix-blend
 *     screen, which iOS WebKit paints as black boxes, so those are hidden on
 *     phones; a blur-free / blend-free gradient layer (.cj-glow-edge-mobile)
 *     re-adds the same sphere-colored edges on mobile.
 *   • The video AND the color sampling both stop when the hero leaves the
 *     viewport (no idle work); prefers-reduced-motion shows a static frame
 *     with no playback, no sampling, and no listeners.
 */

// H.264 MP4 is hardware-decoded in every browser → smooth playback.
const VIDEO_SRC_MP4 = "/sphere-montage.mp4";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);
  const reducedRef = useRef(false);
  const isMobileRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    reducedRef.current = !!reduced;
  }, [reduced]);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  // Viewport size watcher (drives mobile vs desktop auto-scroll hand-off).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Loop playback, color sampling, hand-off, and off-screen suspend ──
  useEffect(() => {
    if (typeof window === "undefined" || !mounted) return;
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    const applyFades = (e: number) => {
      const headline = headlineRef.current;
      if (headline) {
        headline.style.opacity = clamp01(1 - e / 0.7).toFixed(3);
        headline.style.transform = `translateY(${(e * -50).toFixed(1)}px)`;
      }
      const cue = cueRef.current;
      if (cue) cue.style.opacity = clamp01(1 - e / 0.4).toFixed(3);
    };
    const restoreFades = () => {
      const headline = headlineRef.current;
      if (headline) {
        headline.style.opacity = "1";
        headline.style.transform = "translateY(0px)";
      }
      const cue = cueRef.current;
      if (cue) cue.style.opacity = "1";
    };

    // Announce readiness for the loading screen (harmless if home isn't gated).
    let announced = false;
    const announce = () => {
      if (announced) return;
      announced = true;
      try {
        window.dispatchEvent(new Event("refgd:scene-ready"));
      } catch {
        /* noop */
      }
    };
    const onLoadedData = () => announce();
    if (video.readyState >= 2) onLoadedData();
    else video.addEventListener("loadeddata", onLoadedData);

    // ── Reduced motion: one static frame, no loop, no sampling, no listeners ──
    if (reducedRef.current) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {
        /* noop */
      }
      return () => {
        video.removeEventListener("loadeddata", onLoadedData);
      };
    }

    // ── Color sampling → drives the --glow CSS variable (no React re-renders) ──
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let cur = [90, 130, 255]; // start on a cool blue
    let lastSample = 0;
    let sampleRaf = 0;
    let sampling = false;

    const sampleTick = (t: number) => {
      if (!sampling) return;
      sampleRaf = requestAnimationFrame(sampleTick);
      if (!ctx || video.readyState < 2 || video.paused) return;
      if (t - lastSample < 90) return; // ~11 Hz
      lastSample = t;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let rs = 0, gs = 0, bs = 0, ws = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const lum = r + g + b;
          if (lum < 70) continue; // skip the near-black background
          const w = lum * lum; // emphasize the bright vivid core
          rs += r * w; gs += g * w; bs += b * w; ws += w;
        }
        if (ws > 0) {
          let r = rs / ws, g = gs / ws, b = bs / ws;
          const avg = (r + g + b) / 3;
          const k = 1.4; // saturation boost so the edge glow reads as a real color
          r = Math.min(255, avg + (r - avg) * k);
          g = Math.min(255, avg + (g - avg) * k);
          b = Math.min(255, avg + (b - avg) * k);
          cur = [
            cur[0] + (r - cur[0]) * 0.12,
            cur[1] + (g - cur[1]) * 0.12,
            cur[2] + (b - cur[2]) * 0.12,
          ];
          section.style.setProperty(
            "--glow",
            `${Math.round(cur[0])}, ${Math.round(cur[1])}, ${Math.round(cur[2])}`,
          );
        }
      } catch {
        /* sampling can briefly throw before metadata is ready */
      }
    };
    const startSampling = () => {
      if (sampling) return;
      sampling = true;
      sampleRaf = requestAnimationFrame(sampleTick);
    };
    const stopSampling = () => {
      sampling = false;
      cancelAnimationFrame(sampleRaf);
    };

    // Keep the sphere looping while it is on screen.
    const playLoop = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const setHeroFlight = (on: boolean) => {
      try {
        document.documentElement.classList.toggle("hero-flight", on);
      } catch {
        /* noop */
      }
    };

    const lenis = () =>
      (window as unknown as { __lenis?: { stop?: () => void; start?: () => void; scrollTo?: (t: unknown, o?: unknown) => void } }).__lenis;

    type State = "idle" | "handoff" | "done";
    let state: State = "idle";
    let handoffRaf = 0;
    let blockOn = false;

    // Capture-phase swallow of scroll input during the short auto-scroll glide.
    const swallow = (ev: Event) => {
      if (ev.cancelable) ev.preventDefault();
      ev.stopPropagation();
    };
    const blockKeys = (ev: KeyboardEvent) => {
      const k = ev.key;
      if (
        k === "ArrowDown" || k === "ArrowUp" || k === "PageDown" ||
        k === "PageUp" || k === " " || k === "Home" || k === "End"
      ) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };
    const attachBlock = () => {
      if (blockOn) return;
      blockOn = true;
      window.addEventListener("wheel", swallow, { passive: false, capture: true });
      // Mobile: do NOT swallow touchmove during the glide — a deliberate
      // finger swipe must be able to interrupt/override the auto-scroll so
      // it never feels like a locked "yank". Desktop still swallows wheel.
      if (!isMobileRef.current) {
        window.addEventListener("touchmove", swallow, { passive: false, capture: true });
      }
      window.addEventListener("keydown", blockKeys, { capture: true });
    };
    const releaseBlock = () => {
      if (!blockOn) return;
      blockOn = false;
      window.removeEventListener("wheel", swallow, { capture: true } as EventListenerOptions);
      window.removeEventListener("touchmove", swallow, { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown", blockKeys, { capture: true } as EventListenerOptions);
    };

    // Ease the welcome text out over the glide for a clean hand-off.
    const HANDOFF_MS = 900;
    const startHandoff = () => {
      if (state !== "idle") return;
      state = "handoff";
      setHeroFlight(true);
      attachBlock();
      const l = lenis();
      const target = document.getElementById("paths");
      if (l && l.start) l.start();
      if (!isMobileRef.current && l && l.scrollTo && target) {
        l.scrollTo(target, {
          offset: 0,
          duration: HANDOFF_MS / 1000,
          easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        });
      } else if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
      const t0 = performance.now();
      const drive = (now: number) => {
        const e = clamp01((now - t0) / HANDOFF_MS);
        applyFades(e);
        if (e >= 1) {
          state = "done";
          releaseBlock();
          setHeroFlight(false);
          return;
        }
        handoffRaf = requestAnimationFrame(drive);
      };
      handoffRaf = requestAnimationFrame(drive);
    };

    // ── Reverse handoff: upward intent near the hero/#paths boundary glides
    //    all the way back to the very TOP so the visitor is never parked
    //    between the hero and the first section. Mirror of startHandoff. ──
    const startHandoffUp = () => {
      if (state !== "done") return;
      state = "handoff";
      setHeroFlight(true);
      attachBlock();
      const l = lenis();
      if (l && l.start) l.start();
      // Mobile: use NATIVE smooth scroll, not lenis.scrollTo — a lenis rAF
      // tween isn't cancelled by a finger swipe (it fights the user for the
      // full glide = "yank, can't stop it"); native smooth scroll IS
      // interrupted by a touch-scroll. Desktop keeps lenis (byte-for-byte).
      if (!isMobileRef.current && l && l.scrollTo) {
        l.scrollTo(0, {
          offset: 0,
          duration: HANDOFF_MS / 1000,
          easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      const t0 = performance.now();
      const drive = (now: number) => {
        const e = clamp01((now - t0) / HANDOFF_MS);
        // Ease the welcome text back IN (1 → 0 = faded → fully visible).
        applyFades(1 - e);
        if (e >= 1) {
          state = "idle";
          releaseBlock();
          setHeroFlight(false);
          restoreFades();
          return;
        }
        handoffRaf = requestAnimationFrame(drive);
      };
      handoffRaf = requestAnimationFrame(drive);
    };

    // ── Off-screen suspend (perf): stop loop AND sampling when hero leaves ──
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          playLoop();
          startSampling();
        } else {
          video.pause();
          stopSampling();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(section);

    // Kick things off immediately (the IO callback also fires shortly after).
    playLoop();
    startSampling();

    // ── Scroll snap — works on BOTH mobile (scroll events) and desktop ──
    // Fires on every native scroll: down from top → glide to #paths;
    // up near the boundary → glide back to top. Never yanks from deep content.
    const atTop = () => window.scrollY <= 2;
    const nearBoundary = () => window.scrollY <= window.innerHeight * 1.15;
    // Mobile: the up-handoff must NOT fire while browsing the path cards.
    // #paths starts ~1 viewport down, so the 1.15 boundary catches the
    // cards and yanks back to the top on any small upward swipe. On mobile
    // require the hero to actually be re-entering view (<= 0.5vh). Desktop
    // keeps 1.15 so wheel/keyboard handoff stays byte-for-byte unchanged.
    const nearBoundaryUp = () =>
      window.scrollY <= window.innerHeight * (isMobileRef.current ? 0.5 : 1.15);
    let prevY = window.scrollY;
    const onScrollTrigger = () => {
      const y = window.scrollY;
      const goingDown = y > prevY;
      const goingUp = y < prevY;
      const wasAtTop = prevY <= 2;
      prevY = y;
      if (state === "idle" && goingDown && wasAtTop && y > 2 && y < window.innerHeight * 0.6) {
        startHandoff();
      } else if (state === "done" && goingUp && nearBoundaryUp()) {
        startHandoffUp();
      }
    };
    // Re-arm when the user returns to the very top manually.
    const onScrollReset = () => {
      if (state === "done" && window.scrollY < 8) {
        state = "idle";
        cancelAnimationFrame(handoffRaf);
        restoreFades();
        setHeroFlight(false);
      }
    };

    // -- Mobile: DIRECTION-DETERMINISTIC commit-snap at hero <-> #paths --
    //    The owner wants the single hero/paths transition to commit FULLY and
    //    FAST — "no matter how I scroll": down ALWAYS lands on the cards
    //    ("Choose your path" + swipe visible), up ALWAYS lands back at the top,
    //    never resting half-sphere/half-cards — yet every other scroll stays
    //    100% native (browsing the cards/overlays/telegram box is untouched and
    //    the snap can NEVER reach the telegram box).
    //
    //    Mechanism: between gestures we watch the momentum tail. The MOMENT it
    //    decays to ~SLOW_DELTA px/event for SLOW_HITS events the fling is nearly
    //    spent, so we commit immediately (fires ~200-400ms into a flick instead
    //    of waiting ~1-2s for it to fully stop) — firing at near-zero velocity
    //    means the native smooth-scroll has almost no momentum left to fight.
    //    The target is chosen purely by travel DIRECTION (down -> pathsTop, up
    //    -> 0); a down fling that begins in the hero is corrected back to the
    //    cards even if it overshoots a little. A finger always cancels an
    //    in-flight glide, and a stalled UA glide is re-evaluated by a guard.
    const SNAP_TOL = 24; // arrival / "already committed" tolerance (glide detect)
    const SNAP_MIN = 4; // don't bother snapping for sub-4px gaps
    const QUIET_MS = 120; // fallback: fire this long after the last scroll event
    const SLOW_DELTA = 8; // px/event under which momentum counts as "nearly done"
    const SLOW_HITS = 2; // consecutive slow events that trigger the fast fire
    let settleTimer = 0;
    let guardTimer = 0;
    let lastY = Math.max(0, window.scrollY);
    let lastDir = 0; // 1 = down, -1 = up, 0 = unknown
    let slowCount = 0; // consecutive post-lift slow-delta events
    let touching = false;
    let interacted = false; // only snap after a real gesture (not scroll-restore)
    let gestureMoved = false; // did the current/just-ended gesture move the page?
    let gestureStartY = 0; // scrollY captured at touchstart (overshoot eligibility)
    let downEligibleStart = false; // gesture began in the hero -> down commits to cards
    let snapAnimating = false;
    let snapTarget = 0;
    let atTopRestored = false;
    const pathsTop = () => {
      const p = document.getElementById("paths");
      // rect-based (NOT offsetTop): #paths sits inside position:relative
      // ancestors, so offsetTop would be measured from the wrong box.
      return p ? Math.round(p.getBoundingClientRect().top + window.scrollY) : null;
    };
    const clearGuard = () => {
      snapAnimating = false;
      if (guardTimer) {
        clearTimeout(guardTimer);
        guardTimer = 0;
      }
    };
    // True only where a snap should commit: inside the one transition viewport,
    // OR a down gesture that began in the hero and overshot a little past the
    // cards' top (corrected back so "down" always lands on "Choose your path").
    // A hard fling that blows DEEP past pt (>0.6vh) is left alone, and any
    // settle at/below the cards from a non-hero gesture stays native — so the
    // snap can never reach the telegram box and never fights card browsing.
    const eligible = (y: number, pt: number) => {
      if (y <= SNAP_TOL) return false; // already committed at the very top
      if (y < pt - SNAP_MIN) return true; // inside the hero <-> cards zone
      return downEligibleStart && lastDir > 0 && y < pt + window.innerHeight * 0.6;
    };
    const runSnap = () => {
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = 0;
      }
      slowCount = 0;
      if (touching || snapAnimating) return;
      const pt = pathsTop();
      if (pt == null) return;
      const y = Math.max(0, window.scrollY);
      if (!eligible(y, pt)) return;
      // DIRECTION WINS (no nearest-edge bands): the last travel direction is the
      // user's true final intent — it tracks the momentum tail after lift. Down
      // -> cards (pt), up -> top (0). A pure tap that cancelled a glide WITHOUT
      // moving (gestureMoved=false) has no direction, so fall back to the nearer
      // edge.
      let target: number;
      if (!gestureMoved) target = y < pt / 2 ? 0 : pt;
      else if (lastDir > 0) target = pt;
      else if (lastDir < 0) target = 0;
      else target = y < pt / 2 ? 0 : pt;
      if (Math.abs(y - target) <= SNAP_MIN) return;
      snapAnimating = true;
      snapTarget = target;
      window.scrollTo({ top: target, behavior: "smooth" });
      // Native smooth-scroll has no end event: the guard clears on arrival (in
      // onScrollMobile) or a finger (touchstart). If the UA glide STALLS
      // mid-zone (an iOS toolbar resize can abort it) no scroll events fire, so
      // the safety timeout must RE-EVALUATE — not merely clear the flag — or the
      // page would rest half-and-half forever. Safari's UA glide for ~1 viewport
      // can exceed 700ms, so use 1000ms.
      if (guardTimer) clearTimeout(guardTimer);
      guardTimer = window.setTimeout(onGuardTimeout, 1000);
    };
    const onGuardTimeout = () => {
      snapAnimating = false;
      guardTimer = 0;
      if (!touching) runSnap(); // re-fire if a stalled glide left us mid-zone
    };
    // Fallback for a drag that stops DEAD (no decaying momentum events for the
    // velocity-gate to catch): fire shortly after the last scroll event.
    const armSettle = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = window.setTimeout(runSnap, QUIET_MS);
    };
    const onScrollMobile = () => {
      const y = Math.max(0, window.scrollY); // clamp: iOS rubber-band fires < 0
      const delta = Math.abs(y - lastY);
      if (y > lastY) lastDir = 1;
      else if (y < lastY) lastDir = -1;
      lastY = y;
      if (touching && delta > 0) gestureMoved = true;
      applyFades(clamp01(y / (window.innerHeight * 0.65)));
      // Fully restore the hero text once, on returning to the very top.
      if (y < 8) {
        if (!atTopRestored) {
          restoreFades();
          atTopRestored = true;
        }
      } else {
        atTopRestored = false;
      }
      if (snapAnimating) {
        // Arrived — release the guard. Never re-arm anything mid-glide.
        if (Math.abs(y - snapTarget) <= SNAP_TOL) clearGuard();
        return;
      }
      // Only act between gestures (finger up) and after a real interaction (so a
      // load-time scroll-restoration event can never trigger a snap).
      if (!touching && interacted) {
        // FAST fire: once the momentum tail decays to <= SLOW_DELTA px/event for
        // SLOW_HITS events the fling is nearly spent, so commit NOW instead of
        // waiting for it to fully stop. Near-zero velocity == near-zero fight.
        if (delta <= SLOW_DELTA) {
          slowCount += 1;
          if (slowCount >= SLOW_HITS) {
            runSnap();
            return;
          }
        } else {
          slowCount = 0;
        }
        // Dead-stop fallback (no further events to gate on).
        armSettle();
      }
    };
    const onTouchStartMobile = () => {
      touching = true;
      interacted = true;
      gestureMoved = false;
      slowCount = 0;
      gestureStartY = Math.max(0, window.scrollY);
      const pt = pathsTop();
      // A down gesture that BEGINS in the hero/transition (above the cards' top)
      // must commit to the cards even if its momentum overshoots past pt. A
      // gesture that begins at/below the cards is normal browsing — never
      // corrected — so the telegram box stays unreachable by the snap.
      downEligibleStart = pt != null && gestureStartY < pt - SNAP_TOL;
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = 0;
      }
      // A finger always reclaims ownership from any in-flight programmatic glide.
      clearGuard();
    };
    const onTouchEndMobile = () => {
      touching = false;
      // Arm the dead-stop fallback; the velocity-gate in onScrollMobile usually
      // fires sooner. A pure tap that cancelled a glide (gestureMoved=false)
      // re-evaluates here and commits to the nearer edge.
      armSettle();
    };
    let cleanupMobile = () => {};
    if (isMobileRef.current) {
      window.addEventListener("scroll", onScrollMobile, { passive: true });
      window.addEventListener("touchstart", onTouchStartMobile, { passive: true });
      window.addEventListener("touchend", onTouchEndMobile, { passive: true });
      window.addEventListener("touchcancel", onTouchEndMobile, { passive: true });
      cleanupMobile = () => {
        if (settleTimer) clearTimeout(settleTimer);
        if (guardTimer) clearTimeout(guardTimer);
        window.removeEventListener("scroll", onScrollMobile);
        window.removeEventListener("touchstart", onTouchStartMobile);
        window.removeEventListener("touchend", onTouchEndMobile);
        window.removeEventListener("touchcancel", onTouchEndMobile);
      };
    } else {
      window.addEventListener("scroll", onScrollTrigger, { passive: true });
      window.addEventListener("scroll", onScrollReset, { passive: true });
    }

    // ── Desktop only: precise wheel/keyboard triggers on top of scroll ──
    let cleanupDesktop = () => {};
    if (!isMobileRef.current) {
      const onWheel = (ev: WheelEvent) => {
        if (state === "idle" && ev.deltaY > 0 && atTop()) {
          if (ev.cancelable) ev.preventDefault();
          startHandoff();
        } else if (state === "done" && ev.deltaY < 0 && nearBoundary()) {
          if (ev.cancelable) ev.preventDefault();
          startHandoffUp();
        }
      };
      const onKey = (ev: KeyboardEvent) => {
        if (
          state === "idle" && atTop() &&
          (ev.key === "ArrowDown" || ev.key === "PageDown" || ev.key === " " || ev.key === "End")
        ) {
          ev.preventDefault();
          startHandoff();
        } else if (
          state === "done" && nearBoundary() &&
          (ev.key === "ArrowUp" || ev.key === "PageUp" || ev.key === "Home")
        ) {
          ev.preventDefault();
          startHandoffUp();
        }
      };
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("keydown", onKey);
      cleanupDesktop = () => {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKey);
      };
    }

    let cleanupTriggers = () => {
      window.removeEventListener("scroll", onScrollTrigger);
      window.removeEventListener("scroll", onScrollReset);
      cleanupMobile();
      cleanupDesktop();
    };

    return () => {
      cancelAnimationFrame(handoffRaf);
      stopSampling();
      releaseBlock();
      cleanupTriggers();
      io.disconnect();
      video.removeEventListener("loadeddata", onLoadedData);
      const l = lenis();
      if (l && l.start) l.start();
      setHeroFlight(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, reduced, isMobile]);

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      data-hero-build="mobile-snap-5"
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", ["--glow" as string]: "90, 130, 255" }}
    >
      {/* Solid near-black backdrop so the hero is never blank before the first
          frame paints. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "#05060a" }}
      />

      {/* Ambient glow behind the sphere — tinted to its current color. */}
      <div
        aria-hidden="true"
        className="cj-glow-ambient pointer-events-none absolute left-1/2 top-1/2"
        style={{
          width: "72vmin",
          height: "72vmin",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(var(--glow), 0.55), rgba(var(--glow), 0.12) 45%, transparent 68%)",
          filter: "blur(70px)",
          transition: "background 0.25s linear",
        }}
      />

      {/* ── Looping sphere clip ── */}
      <video
        ref={videoRef}
        aria-hidden="true"
        className="cj-hero-video absolute left-1/2 top-1/2"
        muted
        loop={!reduced}
        autoPlay={!reduced}
        playsInline
        preload="auto"
        poster="/sphere-poster.webp"
        style={{
          width: "100%",
          transform: "translate(-50%, -50%)",
          objectFit: "cover",
          display: "block",
        }}
      >
        <source src={VIDEO_SRC_MP4} type="video/mp4" />
      </video>

      {/* MOBILE-only painted edge vignette (.cj-hero-vignette). Fades the video
          rectangle into the #05060a hero backdrop with a plain background
          gradient iOS always honours, doing the job the unreliable <video>
          mask can't. Hidden on desktop, where the mask handles the edges. */}
      <div
        aria-hidden="true"
        className="cj-hero-vignette pointer-events-none absolute inset-0"
      />

      {/* Dark scrim behind the text for white-text legibility. The mobile vs
          desktop gradients live in CSS (.cj-hero-scrim) — NOT a React isMobile
          flag — so phones paint the soft mobile wash on the very first frame
          instead of briefly showing the desktop hard-edged oval. Rendered
          before the colored edges so the edge glow paints on top. */}
      <div
        aria-hidden="true"
        className="cj-hero-scrim pointer-events-none absolute inset-0"
      />

      {/* Soft blurred gradient EDGES, tinted live to the sphere color. Wide,
          strong band so the color is clearly visible around the whole frame. */}
      <div
        aria-hidden="true"
        className="cj-glow-edge pointer-events-none absolute"
        style={{
          inset: "-12%",
          background:
            "radial-gradient(115% 115% at 50% 50%, transparent 34%, rgba(var(--glow), 0.45) 66%, rgba(var(--glow), 0.85) 92%, rgba(var(--glow), 0.95) 100%)",
          filter: "blur(55px)",
          mixBlendMode: "screen",
          transition: "background 0.25s linear",
        }}
      />

      {/* Extra CORNER glow — four radial pools anchored to each corner so the
          color reads strongest in the corners (on top of the edge band). */}
      <div
        aria-hidden="true"
        className="cj-glow-corner pointer-events-none absolute"
        style={{
          inset: "-12%",
          background:
            "radial-gradient(46% 46% at 0% 0%, rgba(var(--glow), 0.9), transparent 72%), radial-gradient(46% 46% at 100% 0%, rgba(var(--glow), 0.9), transparent 72%), radial-gradient(46% 46% at 0% 100%, rgba(var(--glow), 0.9), transparent 72%), radial-gradient(46% 46% at 100% 100%, rgba(var(--glow), 0.9), transparent 72%)",
          filter: "blur(45px)",
          mixBlendMode: "screen",
          transition: "background 0.25s linear",
        }}
      />

      {/* MOBILE-only colored EDGES, tinted live to the sphere color. The
          desktop .cj-glow-edge/.cj-glow-corner use filter:blur + mix-blend
          screen (black boxes on iOS), so this blur-free / blend-free gradient
          stack (in globals.css, @media max-width:768px) re-adds the same
          sphere-colored edge + corner glow on phones. */}
      <div
        aria-hidden="true"
        className="cj-glow-edge-mobile pointer-events-none absolute inset-0"
      />

      <div className="absolute inset-0 grid place-items-center">
        {/* ── WELCOME headline ── */}
        <motion.div
          ref={headlineRef}
          className="container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center"
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <KineticText
            as="h1"
            text={kicker}
            className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
            style={{ textShadow: "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)" }}
            stagger={0.08}
            delay={0.15}
          />
        </motion.div>
      </div>

      {/* ── Bold, unmissable scroll cue ── */}
      <div
        ref={cueRef}
        data-testid="hero-scroll-indicator"
        className="absolute bottom-10 left-1/2 z-[6] flex -translate-x-1/2 flex-col items-center gap-3 text-white"
        style={{ opacity: 1 }}
      >
        <style>{`
          @keyframes cj-cue-bounce {
            0%, 100% { transform: translateY(0); opacity: 1; }
            50%      { transform: translateY(7px); opacity: 0.55; }
          }
          @media (prefers-reduced-motion: reduce) {
            .cj-cue-chevron { animation: none !important; }
          }
        `}</style>
        <span
          className="heading-display rounded-full border border-amber-200/40 bg-black/30 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.4em] backdrop-blur-sm sm:text-sm"
          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,237,180,0.55)" }}
        >
          Scroll to begin
        </span>
        <svg
          className="cj-cue-chevron h-6 w-6 text-amber-200"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ animation: "cj-cue-bounce 1.6s ease-in-out infinite", filter: "drop-shadow(0 0 8px rgba(255,237,180,0.7))" }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}
