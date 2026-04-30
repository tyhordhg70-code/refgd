"use client";
import { motion, useReducedMotion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
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
  const [isMobile, setIsMobile] = useState(false);
  const [showMidFlight, setShowMidFlight] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  // Mount streaks — desktop 36, mobile 6. Mobile is cut to a token
  // burst — at 14 the parallel framer-motion animations fight the
  // initial-paint rasteriser on phones, producing the "laggy first
  // second" the user complained about.
  const streaks = useMemo(() => {
    const total = isMobile ? 6 : 36;
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


  // ── Scroll-linked exit ───────────────────────────────────────────
  //
  // The welcome section is 200 svh tall on desktop / 150 svh on mobile.
  // An inner sticky viewport holds the visual at the top of the screen
  // while the user scrolls through the section's full height.
  // scrollYProgress goes from 0 (section top at viewport top) to 1
  // (section bottom at viewport top = user has scrolled past).
  //
  // We drive the stage's scale/rotateX/y/opacity directly from scroll
  // position — zero JS interval/setTimeout/rAF, runs on the compositor.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Exit during scrollYProgress 0→0.5 (first 100svh, while sticky is active)
  const dtScale    = useTransform(scrollYProgress, [0, 0.5], [1, 0.08]);
  const dtRotateX  = useTransform(scrollYProgress, [0, 0.5], [0, -55]);
  const dtY        = useTransform(scrollYProgress, [0, 0.5], [0, -200]);
  const dtOpacity  = useTransform(scrollYProgress, [0.28, 0.5], [1, 0]);

  // Mobile: cinematic but lighter
  const mbScale    = useTransform(scrollYProgress, [0, 0.5], [1, 0.5]);
  const mbRotateX  = useTransform(scrollYProgress, [0, 0.5], [0, -22]);
  const mbY        = useTransform(scrollYProgress, [0, 0.5], [0, -100]);
  const mbOpacity  = useTransform(scrollYProgress, [0.3, 0.5], [1, 0]);

  const stageScale   = isMobile ? mbScale   : dtScale;
  const stageRotateX = isMobile ? mbRotateX : dtRotateX;
  const stageY       = isMobile ? mbY       : dtY;
  const stageOpacity = isMobile ? mbOpacity : dtOpacity;

  // Scroll indicator fades out once user starts scrolling.
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);

  // Mid-flight warp effects — desktop only, show in the 35-90% scroll range.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setShowMidFlight(v > 0.18 && v < 0.44 && !reduced && !isMobile);
  });

  return (
    <>
      {/*
       * Scroll-linked welcome — no JS-driven triggers, no position:fixed,
       * no auto-scroll. The section is intentionally TALL (200 svh desktop /
       * 150 svh mobile) so the user has a generous scroll range to travel
       * through the exit animation at their own pace. A sticky inner viewport
       * holds the visual at the top of the screen during the whole journey.
       * When the section's bottom edge reaches the top of the viewport the
       * scene is fully gone and the paths section slides into view naturally.
       */}
      <section
        ref={sectionRef}
        data-testid="cosmic-journey"
        className="relative w-full"
        style={{ height: isMobile ? "180svh" : "215svh" }}
      >
        {/* Sticky viewport — the scene lives here and stays pinned to
            the top of the viewport while the user scrolls through the
            section's extra height. No JS: pure CSS position:sticky. */}
        <div
          className="sticky top-0 grid w-full place-items-center overflow-hidden"
          style={{
            height: "100svh",
            perspective: "1400px",
            contain: "layout paint",
          }}
        >
          {/* Scene stage — driven by scroll, not by timers */}
          <motion.div
            className="absolute inset-0 grid place-items-center"
            style={{
              scale: stageScale,
              rotateX: stageRotateX,
              y: stageY,
              opacity: stageOpacity,
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
          style={{ opacity: scrollIndicatorOpacity }}
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
        style={{ display: showMidFlight ? "block" : "none" }}
      >
        {/* White flash — "camera passes through" beat */}
        <motion.div
          key={"flash"}
          className="absolute inset-0 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.45, 0] }}
          transition={{ duration: 0.85, times: [0, 0.4, 0.9], ease: "easeOut" }}
        />

        {/* Jump-to-lightspeed warp streaks */}
        <div className="absolute inset-0 grid place-items-center">
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
      </div>
    </div>

        {/* Warp filler — fills blank space after welcome exits.
            On scroll-down: visible between planet-fade and paths.
            On scroll-up: first content seen when approaching from below,
            eliminating the "welcome breaks on scroll-up" blank. CSS-only. */}
        <div
          aria-hidden="true"
          className="relative pointer-events-none"
          style={{
            height: isMobile ? "80svh" : "115svh",
            background: "transparent",
            overflow: "hidden",
          }}
        >
          <style>{`
            @keyframes cj-shoot {
              0%   { transform: translateX(0) translateY(0) scaleX(0.3); opacity: 0; }
              10%  { opacity: 1; }
              100% { transform: translateX(-140vw) translateY(60vh) scaleX(1); opacity: 0; }
            }
          `}</style>
          {[
            { top: "9%", left: "88%", w: 90, delay: "0.00s", dur: "1.60s", angle: -8 },
            { top: "26%", left: "89%", w: 113, delay: "0.31s", dur: "1.87s", angle: 3 },
            { top: "43%", left: "90%", w: 136, delay: "0.62s", dur: "2.14s", angle: -8 },
            { top: "60%", left: "91%", w: 159, delay: "0.93s", dur: "2.41s", angle: 3 },
            { top: "77%", left: "92%", w: 182, delay: "1.24s", dur: "2.68s", angle: -8 },
            { top: "94%", left: "93%", w: 205, delay: "1.55s", dur: "2.95s", angle: 3 },
            { top: "16%", left: "94%", w: 228, delay: "1.86s", dur: "3.22s", angle: -8 },
            { top: "33%", left: "95%", w: 251, delay: "2.17s", dur: "3.49s", angle: 3 },
            { top: "50%", left: "96%", w: 94, delay: "2.48s", dur: "3.76s", angle: -8 },
            { top: "67%", left: "97%", w: 117, delay: "2.79s", dur: "1.83s", angle: 3 },
            { top: "84%", left: "98%", w: 140, delay: "3.10s", dur: "2.10s", angle: -8 },
            { top: "6%", left: "99%", w: 163, delay: "3.41s", dur: "2.37s", angle: 3 },
            { top: "23%", left: "88%", w: 186, delay: "0.22s", dur: "2.64s", angle: -8 },
            { top: "40%", left: "89%", w: 209, delay: "0.53s", dur: "2.91s", angle: 3 },
            { top: "57%", left: "90%", w: 232, delay: "0.84s", dur: "3.18s", angle: -8 },
            { top: "74%", left: "91%", w: 255, delay: "1.15s", dur: "3.45s", angle: 3 },
            { top: "91%", left: "92%", w: 98, delay: "1.46s", dur: "3.72s", angle: -8 },
            { top: "13%", left: "93%", w: 121, delay: "1.77s", dur: "1.79s", angle: 3 },
            { top: "30%", left: "94%", w: 144, delay: "2.08s", dur: "2.06s", angle: -8 },
            { top: "47%", left: "95%", w: 167, delay: "2.39s", dur: "2.33s", angle: 3 },
            { top: "64%", left: "96%", w: 190, delay: "2.70s", dur: "2.60s", angle: -8 },
            { top: "81%", left: "97%", w: 213, delay: "3.01s", dur: "2.87s", angle: 3 },
            { top: "3%", left: "98%", w: 236, delay: "3.32s", dur: "3.14s", angle: -8 },
            { top: "20%", left: "99%", w: 259, delay: "0.13s", dur: "3.41s", angle: 3 },
            { top: "37%", left: "88%", w: 102, delay: "0.44s", dur: "3.68s", angle: -8 },
            { top: "54%", left: "89%", w: 125, delay: "0.75s", dur: "1.75s", angle: 3 },
            { top: "71%", left: "90%", w: 148, delay: "1.06s", dur: "2.02s", angle: -8 },
            { top: "88%", left: "91%", w: 171, delay: "1.37s", dur: "2.29s", angle: 3 },
          ].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                top: s.top,
                left: s.left,
                width: s.w,
                height: 1.5,
                background: "linear-gradient(to left, rgba(255,237,180,0.92) 0%, rgba(255,210,120,0.55) 50%, transparent 100%)",
                boxShadow: "0 0 8px rgba(255,237,180,0.55)",
                transform: `rotate(${s.angle}deg)`,
                transformOrigin: "100% 50%",
                animation: `cj-shoot ${s.dur} ${s.delay} ease-in infinite`,
                willChange: "transform, opacity",
              }}
            />
          ))}
        </div>

    </section>
    </>
  );
}
