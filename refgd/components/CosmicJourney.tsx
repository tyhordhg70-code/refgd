"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import KineticText from "./KineticText";

/**
 * CosmicJourney — load-once cinematic warp + INPUT-INTERCEPTING
 * snap to/from the paths section.
 *
 *   ── On mount (~2.8s timeline) ──────────────────────────────
 *   t=0.00s  nebula backdrop fades up
 *   t=0.10s  warp streaks begin radial expansion from the centre
 *   t=0.30s  central planet starts blooming up from a tiny dot
 *   t=0.80s  halo ring expands outward & pulses once
 *   t=1.55s  WELCOME headline rises in (KineticText stagger)
 *   t=2.60s  scroll hint fades in
 *   t≥2.8s   ambient state — planet softly breathes, scene holds
 *
 *   ── Why we intercept INPUT events, not scroll events ────────
 *   Previous revisions listened to the `scroll` event and snapped
 *   from there. That has two unfixable failure modes:
 *     • HARD scroll → browser scrolls many pixels instantly
 *       BEFORE the scroll handler runs (one rAF frame later).
 *       By the time we fire, the user has already overshot the
 *       snap target, so the snap-then-fight-with-inertia produces
 *       a jittery half-played animation.
 *     • LIGHT scroll → browser scrolls a few pixels, then our
 *       handler kicks in one frame later and starts the smooth
 *       scroll. The visible "tiny native jump → then a smooth
 *       scroll starts from the jumped position" is the stutter.
 *   Solution: hook the INPUT (wheel / touchmove / keydown) with
 *   `passive: false` + `preventDefault()` while the user is in
 *   the welcome / boundary zone, so the browser NEVER scrolls
 *   natively in that range — we own scrollY from the very first
 *   millisecond of user intent.
 *
 *   ── Snap behaviour ──────────────────────────────────────────
 *   • In welcome zone (`scrollY < pathsTarget − 4`):
 *       – wheel / swipe / arrow / space → snap to `pathsTarget`
 *         (= `innerHeight − 20`, kicker line "— you have arrived"
 *         comfortably visible with 20 px breathing room above).
 *       – wheel up → snap to `0`.
 *   • Just past paths boundary, scrolling up
 *     (`pathsTarget ≤ scrollY < pathsTarget + 12`):
 *       – snap back to `0`. (One-wheel response, no overshoot.)
 *   • Past the boundary in the paths / telegram sections:
 *       – we don't intercept. Native scroll works normally.
 *   • A 500 ms cooldown after each snap absorbs trackpad inertia
 *     and iOS rubber-band so a single hard wheel doesn't bounce
 *     us back the other way.
 *
 *   ── Cinematic 3D warp during the snap ───────────────────────
 *   The whole scene-stage flies away in 3D as a rigid unit
 *   (scale 1 → 0.08, rotateX 0 → −55°, y 0 → −200, opacity 1 → 0)
 *   over 1.2 s. Layered on top during the exit:
 *     • A brief WHITE FLASH (peaks at 45 % opacity ~40 % through
 *       the transition) — the "camera passes through the planet"
 *       punctuation.
 *     • 32 RADIAL WARP STREAKS shooting outward from the centre
 *       to ±120 vmin, each scaling 0.5 → 8 → 14 along its length
 *       so they look like jump-to-lightspeed star trails.
 *   Both are mounted only while `exiting` is true — auto-replay
 *   every time the user re-crosses the threshold. The exit is
 *   REVERSIBLE — scroll back up, the stage rotates, scales and
 *   fades back into rest pose.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [exiting, setExiting] = useState(false);

  // 36 mount streaks — radial expansion during the welcome's load-in.
  const streaks = useMemo(() => {
    const colors = ["#ffe28a", "#a78bfa", "#7be7ff", "#f0abfc", "#ffffff"];
    return Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2;
      const reachVw = 60 + ((i * 13) % 40);
      const dx = Math.cos(angle) * reachVw;
      const dy = Math.sin(angle) * reachVw;
      const rotateDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      return {
        dx,
        dy,
        rotateDeg,
        color: colors[i % colors.length],
        width: 1 + (i % 3),
        length: 70 + (i % 6) * 18,
        delay: 0.1 + (i % 14) * 0.04,
      };
    });
  }, []);

  // 32 EXIT streaks — radial jump-to-lightspeed during the fly-away.
  const warpStreaks = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        return {
          dx: Math.cos(angle) * 120,
          dy: Math.sin(angle) * 120,
          rotateDeg: (angle * 180) / Math.PI,
        };
      }),
    [],
  );

  // ── Input-intercepting snap controller ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduced) return;

    let isAnimating = false;
    let activeRAF = 0;

    function smoothScrollTo(targetY: number, duration: number) {
      const startY = window.scrollY;
      const dist = targetY - startY;
      if (Math.abs(dist) < 4) return;
      isAnimating = true;
      cancelAnimationFrame(activeRAF);
      const start = performance.now();
      function step(now: number) {
        const t = Math.min((now - start) / duration, 1);
        // cubic in-out — feels like a weighty camera move
        const eased =
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        window.scrollTo(0, startY + dist * eased);
        if (t < 1) {
          activeRAF = requestAnimationFrame(step);
        } else {
          // Cooldown absorbs trackpad inertia + iOS rubber-band so
          // a single hard wheel doesn't bounce us back the other way.
          window.setTimeout(() => {
            isAnimating = false;
          }, 500);
        }
      }
      activeRAF = requestAnimationFrame(step);
    }

    function getTargets() {
      const innerH = window.innerHeight;
      return {
        pathsTarget: innerH - 20,
        exitThreshold: Math.max(60, innerH * 0.08),
      };
    }

    // Pure observer — derives reversible exit state from scrollY.
    function onScroll() {
      const y = window.scrollY;
      const { exitThreshold } = getTargets();
      setExiting((prev) => {
        const next = y > exitThreshold;
        return next === prev ? prev : next;
      });
    }

    // Wheel — intercept BEFORE the browser scrolls so hard wheels
    // can't overshoot and light wheels don't cause a tiny native
    // jump before the smooth scroll starts.
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) return; // allow pinch-zoom shortcut
      if (Math.abs(e.deltaY) < 1) return;
      const y = window.scrollY;
      const { pathsTarget } = getTargets();

      if (y < pathsTarget - 4) {
        // In the welcome / dead zone — own the scroll completely.
        e.preventDefault();
        if (isAnimating) return;
        if (e.deltaY > 0) {
          smoothScrollTo(pathsTarget, 1100);
        } else if (e.deltaY < 0 && y > 8) {
          smoothScrollTo(0, 1100);
        }
      } else if (y < pathsTarget + 12 && e.deltaY < 0) {
        // Just past the paths boundary, scrolling up → snap back
        // to welcome on the very first wheel notch (no waiting for
        // the user to native-scroll into the dead zone first).
        e.preventDefault();
        if (isAnimating) return;
        smoothScrollTo(0, 1100);
      }
      // Otherwise we're past the welcome zone — native scroll
      // works freely throughout paths / telegram sections.
    }

    // Touch — same intent as wheel, scoped to touches that BEGIN
    // in the welcome / boundary zone so swipes started inside the
    // paths / telegram sections never get hijacked.
    let touchStartY = 0;
    let touchActive = false;
    let touchTriggered = false;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const y = window.scrollY;
      const { pathsTarget } = getTargets();
      touchActive = y < pathsTarget + 12;
      touchStartY = e.touches[0].clientY;
      touchTriggered = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!touchActive || e.touches.length !== 1) return;
      const y = window.scrollY;
      const { pathsTarget } = getTargets();

      e.preventDefault();
      if (isAnimating || touchTriggered) return;

      const currentY = e.touches[0].clientY;
      const swipeDelta = touchStartY - currentY;
      if (Math.abs(swipeDelta) < 12) return;

      touchTriggered = true;
      if (swipeDelta > 0 && y < pathsTarget - 4) {
        smoothScrollTo(pathsTarget, 1100);
      } else if (swipeDelta < 0 && y > 8) {
        smoothScrollTo(0, 1100);
      }
    }

    function onTouchEnd() {
      touchActive = false;
    }

    // Keyboard — PageDown / ArrowDown / Space / End / Home / PageUp.
    function onKey(e: KeyboardEvent) {
      const y = window.scrollY;
      const { pathsTarget } = getTargets();
      const isDown =
        e.key === "PageDown" ||
        e.key === "ArrowDown" ||
        e.key === " " ||
        e.key === "End";
      const isUp =
        e.key === "PageUp" || e.key === "ArrowUp" || e.key === "Home";

      if (isDown && y < pathsTarget - 4) {
        e.preventDefault();
        if (!isAnimating) smoothScrollTo(pathsTarget, 1100);
      } else if (isUp && y < pathsTarget + 12 && y > 8) {
        e.preventDefault();
        if (!isAnimating) smoothScrollTo(0, 1100);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(activeRAF);
    };
  }, [reduced]);

  // 3D exit transform — applied to the entire scene-stage.
  // Single-keyframe so it reverses smoothly when scroll returns
  // toward the top.
  const stageAnimate = exiting
    ? { scale: 0.08, rotateX: -55, y: -200, opacity: 0 }
    : { scale: 1, rotateX: 0, y: 0, opacity: 1 };

  return (
    <section
      data-testid="cosmic-journey"
      className="relative grid w-full place-items-center overflow-hidden"
      style={{
        height: "100svh",
        contain: "layout paint",
        perspective: "1400px",
        transform: "translate3d(0,0,0)",
      }}
    >
      {/*
       * Scene stage — wraps every animated layer of the welcome
       * composition. When `exiting` flips, the whole stage tilts
       * back & flies up in 3D as a single rigid unit, and reverses
       * smoothly when scroll returns toward the top. Duration
       * matched (1.2 s) to feel cohesive with the 1.1 s smooth
       * scroll without ending so abruptly that the streaks haven't
       * finished radiating.
       */}
      <motion.div
        className="absolute inset-0 grid place-items-center"
        animate={stageAnimate}
        transition={{
          duration: 1.2,
          ease: [0.65, 0, 0.35, 1],
        }}
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "50% 28%",
          willChange: "transform, opacity",
        }}
        suppressHydrationWarning
      >
        {/* ── 1. Nebula backdrop ── */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reduced ? { duration: 0 } : { duration: 1.2, ease: "easeOut" }
          }
          style={{
            background:
              "radial-gradient(ellipse at 28% 32%, rgba(167,139,250,0.50) 0%, transparent 45%)," +
              "radial-gradient(ellipse at 75% 60%, rgba(34,211,238,0.42) 0%, transparent 50%)," +
              "radial-gradient(ellipse at 50% 80%, rgba(245,185,69,0.35) 0%, transparent 50%)",
            filter: "blur(40px)",
          }}
          suppressHydrationWarning
        />

        {/* ── 2. Mount warp streaks (load-in animation) ── */}
        {!reduced && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            {streaks.map((s, i) => (
              <motion.span
                key={`streak-${i}`}
                className="absolute rounded-full"
                initial={{ x: 0, y: 0, opacity: 0, scaleX: 0.2 }}
                animate={{
                  x: [`0vmin`, `${s.dx * 0.6}vmin`, `${s.dx}vmin`],
                  y: [`0vmin`, `${s.dy * 0.6}vmin`, `${s.dy}vmin`],
                  opacity: [0, 1, 0],
                  scaleX: [0.3, 1, 1.6],
                }}
                transition={{
                  duration: 2.0,
                  delay: s.delay,
                  ease: [0.16, 0.9, 0.3, 1],
                  times: [0, 0.45, 1],
                }}
                style={{
                  width: s.length,
                  height: s.width,
                  backgroundColor: s.color,
                  boxShadow: `0 0 ${s.width * 6}px ${s.color}`,
                  transform: `rotate(${s.rotateDeg}deg)`,
                  transformOrigin: "0% 50%",
                  willChange: "transform, opacity",
                }}
                suppressHydrationWarning
              />
            ))}
          </div>
        )}

        {/* ── 3. Central planet — blooms up from a tiny dot ── */}
        <motion.div
          className="absolute h-[60vmin] w-[60vmin] rounded-full"
          initial={
            reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.18 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }
          }
          style={{
            background:
              "radial-gradient(circle at 30% 28%, rgba(255,237,180,1) 0%, rgba(245,185,69,0.85) 22%, rgba(167,139,250,0.62) 55%, rgba(34,211,238,0.32) 85%, transparent 100%)",
            boxShadow:
              "0 0 140px 50px rgba(245,185,69,0.40), 0 0 260px 90px rgba(167,139,250,0.28)",
            willChange: "transform, opacity",
          }}
          suppressHydrationWarning
        />

        {/* ── 3b. Slow ambient pulse on planet ── */}
        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="absolute h-[60vmin] w-[60vmin] rounded-full"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.85, 0.55, 0.85, 0.55],
              scale: [1, 1.04, 1, 1.04, 1],
            }}
            transition={{
              duration: 8,
              ease: "easeInOut",
              delay: 2.4,
              times: [0, 0.25, 0.5, 0.75, 1],
              repeat: Infinity,
              repeatType: "loop",
            }}
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 60%)",
              mixBlendMode: "screen",
            }}
            suppressHydrationWarning
          />
        )}

        {/* ── 4. Halo ring ── */}
        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="absolute h-[88vmin] w-[88vmin] rounded-full"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: [0, 0.75, 0.4], scale: 1 }}
            transition={{
              duration: 2.2,
              ease: "easeOut",
              delay: 0.8,
              times: [0, 0.5, 1],
            }}
            style={{
              border: "1px solid rgba(255,225,140,0.40)",
              boxShadow:
                "inset 0 0 90px rgba(245,185,69,0.18), 0 0 140px rgba(167,139,250,0.20)",
              willChange: "transform, opacity",
            }}
            suppressHydrationWarning
          />
        )}

        {/* ── 5. WELCOME headline ── */}
        <motion.div
          className="container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center"
          initial={
            reduced
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 32, scale: 0.95 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 1.55 }
          }
          suppressHydrationWarning
        >
          <KineticText
            as="h1"
            text={kicker}
            className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
            style={{
              textShadow:
                "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)",
            }}
            stagger={0.08}
            delay={1.7}
          />
        </motion.div>

        {/* ── 6. Scroll hint ── */}
        <motion.div
          className="absolute bottom-12 z-[6] flex flex-col items-center gap-3 text-white"
          data-testid="hero-scroll-indicator"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={
            exiting
              ? { opacity: 0, y: 0 }
              : { opacity: 1, y: 0 }
          }
          transition={
            reduced
              ? { duration: 0 }
              : exiting
              ? { duration: 0.4 }
              : { duration: 0.7, ease: "easeOut", delay: 2.6 }
          }
          suppressHydrationWarning
        >
          <span
            className="heading-display text-xs font-bold uppercase tracking-[0.5em] sm:text-sm"
            style={{
              textShadow:
                "0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,237,180,0.65)",
            }}
          >
            scroll
          </span>
          <span
            className="block h-14 w-[2px] animate-pulseGlow rounded-full bg-gradient-to-b from-amber-200 via-white/80 to-transparent"
            style={{ boxShadow: "0 0 14px rgba(255,237,180,0.7)" }}
          />
        </motion.div>
      </motion.div>

      {/*
       * ── Cinematic mid-flight punctuation, only mounted while
       *    exiting=true. Replays every time the user re-crosses
       *    the threshold (because conditional unmount/remount
       *    re-fires `initial → animate`).
       */}
      {exiting && !reduced && (
        <>
          {/* Brief white flash — the "camera passes through" beat */}
          <motion.div
            key="exit-flash"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[20] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.45, 0] }}
            transition={{
              duration: 0.85,
              times: [0, 0.4, 0.9],
              ease: "easeOut",
            }}
          />

          {/* Jump-to-lightspeed radial warp streaks */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[18] grid place-items-center"
          >
            {warpStreaks.map((s, i) => (
              <motion.span
                key={`warp-${i}`}
                className="absolute rounded-full"
                initial={{ x: 0, y: 0, opacity: 0, scaleX: 0.4 }}
                animate={{
                  x: `${s.dx}vmin`,
                  y: `${s.dy}vmin`,
                  opacity: [0, 1, 0],
                  scaleX: [0.5, 8, 14],
                }}
                transition={{
                  duration: 1.0,
                  ease: [0.16, 0.9, 0.3, 1],
                  times: [0, 0.5, 1],
                }}
                style={{
                  width: 110,
                  height: 2,
                  background:
                    "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)",
                  transform: `rotate(${s.rotateDeg}deg)`,
                  transformOrigin: "0% 50%",
                  boxShadow: "0 0 14px rgba(255,230,180,0.85)",
                  willChange: "transform, opacity",
                }}
                suppressHydrationWarning
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
