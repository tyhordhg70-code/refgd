"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import KineticText from "./KineticText";

/**
 * CosmicJourney — load-once cinematic warp + INPUT-INTERCEPTING
 * bidirectional snap to/from the paths section.
 *
 * ── Scroll feel design notes ───────────────────────────────────
 *
 * Easing choice — why cubic-out everywhere for the scroll:
 *   cubic-in-out: slow start → builds → slow end.
 *     Problem: the "slow start" makes the page appear frozen for
 *     the first ~200 ms after a wheel/swipe, which the user reads
 *     as a STUTTER even though the animation is technically running.
 *   cubic-out: fast start → eases gently into the target.
 *     The viewport moves immediately on the first rAF frame, giving
 *     instant tactile feedback, then decelerates for a smooth stop.
 *     This eliminates the "dead beat at the beginning" stutter.
 *
 * Direction-aware stage transition:
 *   Exiting (down): 1.2 s, cubic-in-out [0.65, 0, 0.35, 1] —
 *     the cinematic slow build feels weighty and intentional.
 *   Returning (up): 0.7 s, cubic-out [0.16, 1, 0.3, 1] —
 *     stage rushes back to full opacity/scale in the first ~150 ms
 *     so the hero is visible before the smooth-scroll has moved far.
 *     Without this, the hero is a near-invisible tiny dot for the
 *     first third of the scroll-up, making it look like blank space.
 *
 * Cooldown 500 → 200 ms:
 *   The 500 ms post-snap cooldown was added to absorb trackpad
 *   inertia / iOS rubber-band. However it also blocked the
 *   scroll-UP trigger for half a second after arriving at the paths
 *   section, which the user experienced as a visible "delay".
 *   200 ms is still enough to block one stray inertia wheel event
 *   but imperceptible to deliberate user input.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // exitKey increments each time we enter the exiting state so that
  // the warp streaks unmount+remount and replay their animation
  // cleanly on each scroll-down, instead of being stuck at their
  // end-state from the previous exit.
  const [exitKey, setExitKey] = useState(0);
  const exitingRef = useRef(false);

  // Mobile detection — used to thin out the per-frame DOM work in
  // the streak fields. Mobile GPUs / CPUs choke on dozens of
  // independently-animated absolutely-positioned elements, even
  // though each individual animation is tiny.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Mount streaks — desktop 36, mobile 14. Mobile gets just enough
  // points to read as a "burst" without saturating the rasteriser
  // during the initial paint.
  const streaks = useMemo(() => {
    const total = isMobile ? 14 : 36;
    const colors = ["#ffe28a", "#a78bfa", "#7be7ff", "#f0abfc", "#ffffff"];
    return Array.from({ length: total }, (_, i) => {
      const angle = (i / total) * Math.PI * 2;
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
  }, [isMobile]);

  // Exit warp streaks — desktop 20, mobile 8. Same logic: just
  // enough points to read as a "warp out" without paying the per-
  // frame DOM cost of 20 simultaneous transforms on a phone.
  const warpStreaks = useMemo(
    () => {
      const total = isMobile ? 8 : 20;
      return Array.from({ length: total }, (_, i) => {
        const angle = (i / total) * Math.PI * 2;
        return {
          dx: Math.cos(angle) * 120,
          dy: Math.sin(angle) * 120,
          rotateDeg: (angle * 180) / Math.PI,
        };
      });
    },
    [isMobile],
  );

  // ── Reversible exit observer (NATIVE scroll only) ─────────
  //
  // The previous version of this effect installed an
  // input-intercepting "scroll-jacker": it caught every wheel,
  // touchmove and key event with `passive: false` + preventDefault,
  // then ran its own `window.scrollTo()` rAF loop to do a custom
  // smooth scroll. That was the primary cause of the desktop
  // scroll stutter the user was reporting:
  //
  //   1. `wheel` listener with `passive: false` forces the browser
  //      to wait for the JS handler to run before it can scroll —
  //      the browser CAN'T pre-emptively scroll on the compositor.
  //   2. `window.scrollTo` inside a rAF tick competes with the
  //      browser's own scroll compositor for the same frame.
  //   3. The 200 ms cooldown blocked subsequent input even after
  //      the smooth scroll had finished, so a quick second flick
  //      felt dead.
  //   4. With WebGL + a fixed `mix-blend-screen` overlay rendering
  //      every frame, the compositor was already saturated; adding
  //      a JS scroll on top of that produced visible jank.
  //
  // The rewrite drops the entire interceptor. The browser does
  // native compositor-driven scrolling (smooth, snappy, GPU-only),
  // and a single passive `scroll` listener flips the exit state
  // when the user crosses the threshold. The hero still flies
  // away when leaving and snaps back in when returning — the
  // visual choreography is unchanged — but no input is ever
  // captured or delayed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduced) return;

    function getExitThreshold() {
      return Math.max(60, window.innerHeight * 0.08);
    }

    function onScroll() {
      const y = window.scrollY;
      const next = y > getExitThreshold();
      if (next !== exitingRef.current) {
        exitingRef.current = next;
        if (next) {
          setExitKey((k) => k + 1);
        }
        setExiting(next);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  // ── One-shot snap to "— you have arrived" ─────────────────────
  //
  // The user explicitly asked: "desktop scroll should lock onto
  // 'you have arrived' after scrolling from welcome no matter how
  // fast or light scrolling, both on desktop and mobile".
  //
  // The previous incarnation of this effect was a full scroll-jacker
  // that intercepted every wheel/touchmove with `passive: false` +
  // preventDefault and ran a custom rAF scroll loop. That broke the
  // entire page (the subject of the desktop scroll-stutter fix in
  // commit 07d5a1c).
  //
  // This implementation is intentionally minimal:
  //
  //   • A single passive `scroll` listener — never preventDefault,
  //     never `passive: false`, no custom rAF loop. The browser's
  //     compositor stays in charge of every frame.
  //   • Triggers exactly ONCE per "departure from welcome" — the
  //     instant the user's scrollY moves from ~0 to anywhere above,
  //     we fire `window.scrollTo({behavior: 'smooth'})` to land at
  //     the paths section kicker, and then we get out of the way.
  //   • Re-arms ONLY when the user returns all the way back to the
  //     welcome (y < 8). After that, a fresh scroll-down snaps to
  //     the kicker again.
  //   • Works equally on desktop wheel and on mobile touch — the
  //     `scroll` event fires for both, and the only thing the snap
  //     does is set the target. The browser handles the smooth
  //     animation natively, so the feel is identical on every
  //     platform.
  //
  // Implementation note on "fast or light":
  //   The user's first wheel notch / touch-drag gives us 1 scroll
  //   event with whatever `y` the browser computed. We immediately
  //   fire `scrollTo(targetY, smooth)`. Whether the user moved
  //   1 px or 600 px, the smooth scroll animates from current
  //   position to targetY and lands there. That's the "lock".
  //
  // Skipping cases:
  //   • Reduced motion users — never snap.
  //   • Page loads already past the welcome (deep link, hash anchor,
  //     hot reload mid-scroll, browser back-forward cache restore)
  //     — start in the snapped state so we don't yank the user from
  //     wherever they intentionally landed.
  // ── Snap-to-paths: DESKTOP + MOBILE, single-fire ──────────────
  //
  // The user explicitly asked for the lock-onto "you have arrived"
  // scroll-snap to work on mobile too. The previous mobile-skip was
  // wrong — it stripped a feature the user wanted. The HAYWIRE
  // problem on mobile was caused by a 3-step reassertion timer
  // (250/550/950 ms) that fired `scrollTo` again and again on top
  // of the user's still-active touch-drag — that's gone. The snap
  // now fires ONCE on the first scroll-down from y≈0 and never
  // reasserts, on either platform.
  //
  // Mobile-specific notes:
  //   • iOS Safari may interrupt the smooth-scroll if the user is
  //     still dragging when we call scrollTo — that's fine, the
  //     user is in control. The snap is a guarantee for INTENTIONAL
  //     small flicks ("I want to leave the welcome screen") not for
  //     a wrestling match against active input.
  //   • The latch never re-arms — once we've fired, scrolling back
  //     to the top and forward again behaves like normal native
  //     scrolling for the rest of the session.
  //
  // No reassertion. No mobile bypass. No re-arming. One fire, done.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduced) return;

    let snapped = window.scrollY >= 60;
    let lastY = window.scrollY;

    function targetY(): number | null {
      const paths = document.getElementById("paths");
      if (!paths) return null;
      const headerOffset = 80;
      return Math.max(
        0,
        Math.round(paths.getBoundingClientRect().top + window.scrollY - headerOffset),
      );
    }

    function onScroll() {
      const y = window.scrollY;
      if (snapped) {
        lastY = y;
        return;
      }
      if (lastY < 8 && y >= 8) {
        const target = targetY();
        if (target == null) {
          lastY = y;
          return;
        }
        snapped = true;
        if (Math.abs(y - target) > 5) {
          window.scrollTo({ top: target, behavior: "smooth" });
        }
      }
      lastY = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  // Direction-aware stage transition.
  //   Exit  → cinematic slow build (cubic-in-out, 1.2 s)
  //   Return → eager rush back (cubic-out, 0.7 s) so the hero is
  //            fully visible within ~150 ms of scroll-up, not blank.
  const stageAnimate = exiting
    ? { scale: 0.08, rotateX: -55, y: -200, opacity: 0 }
    : { scale: 1, rotateX: 0, y: 0, opacity: 1 };

  const stageTransition = exiting
    ? { duration: 1.2, ease: [0.65, 0, 0.35, 1] as const }
    : { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

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
      {/* Scene stage */}
      <motion.div
        className="absolute inset-0 grid place-items-center"
        animate={stageAnimate}
        transition={stageTransition}
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
            reduced ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }
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
                  duration: 1.8,
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

        {/* ── 3. Central planet ── */}
        <motion.div
          className="absolute h-[60vmin] w-[60vmin] rounded-full"
          initial={
            reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.18 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }
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

        {/* ── 3b. Ambient pulse on planet ──
             Uses mix-blend-mode: screen on a 60vmin layer that
             pulsates infinitely. On mobile this is one of the few
             remaining compositor-recompute layers, so it's gated
             behind !isMobile. Desktop visual unchanged. */}
        {!reduced && !isMobile && (
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
              delay: 2.0,
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
              duration: 2.0,
              ease: "easeOut",
              delay: 0.4,
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
              : { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 1.0 }
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
            delay={1.1}
          />
        </motion.div>

        {/* ── 6. Scroll hint ── */}
        <motion.div
          className="absolute bottom-12 z-[6] flex flex-col items-center gap-3 text-white"
          data-testid="hero-scroll-indicator"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={exiting ? { opacity: 0, y: 0 } : { opacity: 1, y: 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : exiting
                ? { duration: 0.4 }
                : { duration: 0.7, ease: "easeOut", delay: 2.0 }
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
       * Cinematic mid-flight effects.
       * Always mounted (empty when not exiting) so there's no
       * mount-jank frame at the moment of first scroll. The inner
       * content is keyed to exitKey so it unmounts+remounts — and
       * thus replays its initial→animate — on every exit.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[18]"
        style={{ display: exiting && !reduced ? "block" : "none" }}
      >
        {/* White flash — "camera passes through" beat */}
        <motion.div
          key={`flash-${exitKey}`}
          className="absolute inset-0 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.45, 0] }}
          transition={{ duration: 0.85, times: [0, 0.4, 0.9], ease: "easeOut" }}
        />

        {/* Jump-to-lightspeed warp streaks */}
        <div className="absolute inset-0 grid place-items-center">
          {warpStreaks.map((s, i) => (
            <motion.span
              key={`warp-${exitKey}-${i}`}
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
      </div>
    </section>
  );
}
