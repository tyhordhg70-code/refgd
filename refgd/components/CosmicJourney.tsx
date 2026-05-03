"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import KineticText from "./KineticText";

/**
 * CosmicJourney — cinematic scroll-linked welcome.
 *
 * Scroll animation architecture (changed from framer-motion useScroll):
 *   Previously: useScroll + 14 useTransform hooks + useMotionValueEvent
 *   → every scroll tick fired 14 motion-value subscriptions inside the
 *     framer-motion engine, each updating its own internal state, and
 *     useMotionValueEvent triggered a React setState (re-render).
 *
 *   Now: one passive scroll event listener → reads scrollY → computes
 *   progress → directly mutates element.style. Zero React re-renders
 *   during scroll. Zero framer-motion subscription overhead per frame.
 *   This is what GSAP/noomo does internally; we just do it ourselves
 *   without the library overhead.
 *
 *   Mount animations (one-shot: nebula fade, planet scale, headline
 *   slide-up) stay as framer-motion initial→animate — they don't loop
 *   or fire on scroll, so their cost is negligible.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [showMidFlight, setShowMidFlight] = useState(false);
  // ──────────────────────────────────────────────────────────────────
  // welcomeReady — gate the welcome headline until the LoadingScreen
  // overlay has lifted. On a HARD page load the overlay sits in front
  // of the page for ~1.5s while images / fonts / scenes warm up. The
  // welcome headline used to start animating immediately on mount,
  // so by the time the user actually saw the page the words were
  // already settled in their final state ("welcome doesn't show on
  // hard load — only on back-nav"). Now we wait for the loading-
  // complete event (with a 2.4s fallback for routes that don't
  // mount LoadingScreen) before the headline is told to play.
  // ──────────────────────────────────────────────────────────────────
  /* v6.13.12 — Default to TRUE.
     Previously defaulted to `false` and waited for the
     `refgd:loading-complete` event fired by <LoadingScreen> when
     the splash lifted. <LoadingScreen> was removed in v6.13.10 per
     user request, so that event NEVER fires any more — the only
     thing that flipped this flag was the 6-s safety timeout in the
     useEffect below. That meant on every fresh paint of the home
     page (including back-nav from another route) the planet, halo,
     warp streaks AND welcome headline were ALL stuck at opacity:0
     for six full seconds, leaving the user staring at a blank
     space until they scrolled back to top and the safety timer
     finally tripped — exactly the report ("planet and text is
     blank screen unless I scroll back up"). Defaulting to `true`
     plays the entrance immediately on mount, which is what users
     always saw before LoadingScreen was added. */
  const [welcomeReady, setWelcomeReady] = useState(true);

  // Refs for direct DOM mutation during scroll
  const sectionRef      = useRef<HTMLElement>(null);
  const stageRef        = useRef<HTMLDivElement>(null);
  const scrollIndRef    = useRef<HTMLDivElement>(null);
  const midFlightRef    = useRef<HTMLDivElement>(null);
  const isMobileRef     = useRef(false);
  const reducedRef      = useRef(false);
  const showMidRef      = useRef(false);

  // Mirror state to refs so the scroll listener closure always has fresh values
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);
  useEffect(() => { reducedRef.current = !!reduced; }, [reduced]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let done = false;
    const trigger = () => {
      if (done) return;
      done = true;
      setWelcomeReady(true);
    };
    window.addEventListener("refgd:loading-complete", trigger as EventListener);
    // Fallback in case LoadingScreen isn't mounted on this route — the
    // headline must NEVER be permanently invisible.
    // v6.10.4: bumped from 2400 → 6000 ms to match useEntranceReady's
    // safety. The previous 2.4 s fallback FIRED BEFORE the genuine
    // `refgd:loading-complete` event on hard loads (LoadingScreen
    // takes ~2.6 s end-to-end: 1.5 s minStall + 280 ms wait + 800 ms
    // fade + 820 ms post-fade gate-defer). The fallback would win by
    // ~200 ms and start the welcome animation while the splash was
    // still mid-fade, so the entrance played invisibly behind the
    // splash. 6 s matches the LoadingScreen Promise.all hard ceiling
    // so the fallback only kicks in if the real event never fires.
    const t = window.setTimeout(trigger, 6000);
    return () => {
      window.removeEventListener(
        "refgd:loading-complete",
        trigger as EventListener,
      );
      window.clearTimeout(t);
    };
  }, []);

  // ── Mount streaks ─────────────────────────────────────────────────
  const streaks = useMemo(() => {
    const total = isMobile ? 6 : 36;
    const colors = ["#ffe28a", "#a78bfa", "#7be7ff", "#f0abfc", "#ffffff"];
    return Array.from({ length: total }, (_, i) => {
      const angle = (i / total) * Math.PI * 2;
      const reachVw = 60 + ((i * 13) % 40);
      const dx = Math.cos(angle) * reachVw;
      const dy = Math.sin(angle) * reachVw;
      return {
        dx, dy,
        rotateDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
        color: colors[i % colors.length],
        width: 1 + (i % 3),
        length: 70 + (i % 6) * 18,
        delay: 0.1 + (i % 14) * 0.04,
      };
    });
  }, [isMobile]);

  const warpStreaks = useMemo(() => {
    const total = isMobile ? 8 : 20;
    return Array.from({ length: total }, (_, i) => {
      const angle = (i / total) * Math.PI * 2;
      return { dx: Math.cos(angle) * 120, dy: Math.sin(angle) * 120, rotateDeg: (angle * 180) / Math.PI };
    });
  }, [isMobile]);

  // ── Scroll-linked transforms — direct DOM mutation ─────────────────
  //
  // Replaces: useScroll, 8× useTransform, useMotionValueEvent, setShowMidFlight
  // Cost per scroll frame: 1 getBoundingClientRect + 3 style.xxx = ~0.1 ms
  // Previous cost:         14 motion-value subscriptions + 1 setState   = ~2–5 ms
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let lastProg = -1;

    const update = () => {
      const rect    = section.getBoundingClientRect();
      const sectionH = section.offsetHeight;
      const viewH    = window.innerHeight;
      // progress: 0 at top, 1 when section has fully scrolled out
      const raw = -rect.top / Math.max(1, sectionH - viewH);
      const progress = raw < 0 ? 0 : raw > 1 ? 1 : raw;

      // Skip work if progress hasn't changed meaningfully
      if (Math.abs(progress - lastProg) < 0.0005) return;
      lastProg = progress;

      const stage     = stageRef.current;
      const scrollInd = scrollIndRef.current;
      const mobile    = isMobileRef.current;
      const red       = reducedRef.current;

      if (stage) {
        // half = progress through first 50 % (sticky active phase)
        const half = progress < 0.5 ? progress / 0.5 : 1;

        const scale  = mobile ? (1 - half * 0.5)  : (1 - half * 0.92);
        const rotX   = mobile ? (half * -22)       : (half * -55);
        const yPx    = mobile ? (half * -100)      : (half * -200);

        // Opacity: start fading at 28 % (desktop) / 30 % (mobile)
        const opStart = mobile ? 0.30 : 0.28;
        const opEnd   = 0.50;
        const opacity = red
          ? 1
          : Math.max(0, Math.min(1, 1 - (progress - opStart) / (opEnd - opStart)));

        if (!red) {
          stage.style.transform = `scale(${scale.toFixed(4)}) rotateX(${rotX.toFixed(2)}deg) translateY(${yPx.toFixed(1)}px)`;
        }
        stage.style.opacity = opacity.toFixed(4);
      }

      // Scroll indicator — fade out over first 6 %
      if (scrollInd) {
        const ind = Math.max(0, Math.min(1, 1 - progress / 0.06));
        scrollInd.style.opacity = ind.toFixed(4);
      }

      // Mid-flight — only trigger React setState when the value CHANGES
      // (max 2 re-renders per scroll-through, not one per frame)
      const shouldMid = progress > 0.18 && progress < 0.44 && !red && !mobile;
      if (shouldMid !== showMidRef.current) {
        showMidRef.current = shouldMid;
        setShowMidFlight(shouldMid);
      }
    };

    window.addEventListener("scroll", update, { passive: true });
    update(); // Apply immediately in case page loads mid-scroll

    return () => window.removeEventListener("scroll", update);
  }, []); // Empty deps — refs always carry the latest values

  return (
    <>
      <section
        ref={sectionRef}
        data-testid="cosmic-journey"
        className="relative w-full"
        style={{ height: isMobile ? "180svh" : "215svh" }}
      >
        <div
          className="sticky top-0 grid w-full place-items-center overflow-hidden"
          style={{ height: "100svh", perspective: "1400px", contain: "layout paint" }}
        >
          {/* Stage — scroll transforms applied via direct style mutation, NOT motion values */}
          <div
            ref={stageRef}
            className="absolute inset-0 grid place-items-center"
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "50% 28%",
              willChange: "transform, opacity",
            }}
          >
            {/* ── 1. Nebula backdrop ── */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              initial={reduced ? { opacity: 1 } : { opacity: 0 }}
              animate={reduced || welcomeReady ? { opacity: 1 } : { opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
              style={{
                // v6.10.4: removed the gold ellipse at 50% 80%. With
                // filter: blur(40px) and 0.35 alpha that radial rendered
                // as a horizontal gold band glued to the bottom of the
                // welcome viewport — the user repeatedly reported this
                // as a "gradient strip on bottom" of the home page.
                // Removing it (and softening the cyan to 0.22 alpha so
                // the right side no longer has a visible cyan halo)
                // leaves the violet wash up top to colour the planet
                // backdrop, with no edge-aligned coloured bands.
                background:
                  "radial-gradient(ellipse at 28% 32%, rgba(167,139,250,0.42) 0%, transparent 50%)," +
                  "radial-gradient(ellipse at 75% 50%, rgba(34,211,238,0.22) 0%, transparent 55%)",
                filter: "blur(40px)",
              }}
            />

            {/* ── 2. Mount warp streaks ── */}
            {!reduced && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
                {streaks.map((s, i) => (
                  <motion.span
                    key={`streak-${i}`}
                    className="absolute rounded-full"
                    initial={{ x: 0, y: 0, opacity: 0, scaleX: 0.2 }}
                    animate={
                      welcomeReady
                        ? {
                            x: [`0vmin`, `${s.dx * 0.6}vmin`, `${s.dx}vmin`],
                            y: [`0vmin`, `${s.dy * 0.6}vmin`, `${s.dy}vmin`],
                            opacity: [0, 1, 0],
                            scaleX: [0.3, 1, 1.6],
                          }
                        : { x: 0, y: 0, opacity: 0, scaleX: 0.2 }
                    }
                    transition={{ duration: 1.8, delay: s.delay, ease: [0.16, 0.9, 0.3, 1], times: [0, 0.45, 1] }}
                    style={{
                      width: s.length, height: s.width,
                      backgroundColor: s.color,
                      boxShadow: `0 0 ${s.width * 6}px ${s.color}`,
                      transform: `rotate(${s.rotateDeg}deg)`,
                      transformOrigin: "0% 50%",
                      willChange: "transform, opacity",
                    }}
                  />
                ))}
              </div>
            )}

            {/* ── 3. Central planet ── */}
            <motion.div
              className="absolute h-[60vmin] w-[60vmin] rounded-full"
              initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.18 }}
              animate={
                reduced || welcomeReady
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0.18 }
              }
              transition={reduced ? { duration: 0 } : { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              style={{
                background:
                  "radial-gradient(circle at 30% 28%, rgba(255,237,180,1) 0%, rgba(245,185,69,0.85) 22%, rgba(167,139,250,0.62) 55%, rgba(34,211,238,0.32) 85%, transparent 100%)",
                boxShadow: "0 0 140px 50px rgba(245,185,69,0.40), 0 0 260px 90px rgba(167,139,250,0.28)",
                willChange: "transform, opacity",
              }}
            />

            {/* ── 3b. Ambient pulse (desktop only — one infinite framer loop, gated) ── */}
            {!reduced && !isMobile && (
              <motion.div
                aria-hidden="true"
                className="absolute h-[60vmin] w-[60vmin] rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.85, 0.55, 0.85, 0.55], scale: [1, 1.04, 1, 1.04, 1] }}
                transition={{ duration: 8, ease: "easeInOut", delay: 2.0, times: [0, 0.25, 0.5, 0.75, 1], repeat: Infinity, repeatType: "loop" }}
                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 60%)", mixBlendMode: "screen" }}
              />
            )}

            {/* ── 4. Halo ring ── */}
            {!reduced && (
              <motion.div
                aria-hidden="true"
                className="absolute h-[88vmin] w-[88vmin] rounded-full"
                initial={{ opacity: 0, scale: 0.55 }}
                animate={
                  welcomeReady
                    ? { opacity: [0, 0.75, 0.4], scale: 1 }
                    : { opacity: 0, scale: 0.55 }
                }
                transition={{ duration: 2.0, ease: "easeOut", delay: 0.4, times: [0, 0.5, 1] }}
                style={{
                  border: "1px solid rgba(255,225,140,0.40)",
                  boxShadow: "inset 0 0 90px rgba(245,185,69,0.18), 0 0 140px rgba(167,139,250,0.20)",
                  willChange: "transform, opacity",
                }}
              />
            )}

            {/* ── 5. WELCOME headline — gated on LoadingScreen lift ── */}
            <motion.div
              className="container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center"
              initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 32, scale: 0.95 }}
              animate={
                reduced
                  ? { opacity: 1, y: 0, scale: 1 }
                  : welcomeReady
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 32, scale: 0.95 }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.05 }
              }
            >
              <KineticText
                as="h1"
                text={kicker}
                className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
                style={{ textShadow: "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)" }}
                stagger={0.08}
                delay={0.15}
                mountTrigger={welcomeReady}
              />
            </motion.div>

            {/* ── 6. Scroll hint — opacity mutated by scroll listener via ref ── */}
            <div
              ref={scrollIndRef}
              className="absolute bottom-12 z-[6] flex flex-col items-center gap-3 text-white"
              data-testid="hero-scroll-indicator"
              style={{ opacity: 1 }}
            >
              <span
                className="heading-display text-xs font-bold uppercase tracking-[0.5em] sm:text-sm"
                style={{ textShadow: "0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,237,180,0.65)" }}
              >
                scroll
              </span>
              <span className="block h-14 w-[2px] animate-pulseGlow rounded-full bg-gradient-to-b from-amber-200 via-white/80 to-transparent" style={{ boxShadow: "0 0 14px rgba(255,237,180,0.7)" }} />
            </div>
          </div>

          {/* ── Mid-flight effects ── */}
          <div
            ref={midFlightRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[18]"
            style={{ display: showMidFlight ? "block" : "none" }}
          >
            <motion.div
              key={showMidFlight ? "flash-on" : "flash-off"}
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.45, 0] }}
              transition={{ duration: 0.85, times: [0, 0.4, 0.9], ease: "easeOut" }}
            />
            <div className="absolute inset-0 grid place-items-center">
              {warpStreaks.map((s, i) => (
                <motion.span
                  key={`warp-${i}-${showMidFlight}`}
                  className="absolute rounded-full"
                  initial={{ x: 0, y: 0, opacity: 0, scaleX: 0.4 }}
                  animate={{ x: `${s.dx}vmin`, y: `${s.dy}vmin`, opacity: [0, 1, 0], scaleX: [0.5, 8, 14] }}
                  transition={{ duration: 1.0, ease: [0.16, 0.9, 0.3, 1], times: [0, 0.5, 1] }}
                  style={{
                    width: 110, height: 2,
                    background: "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)",
                    transform: `rotate(${s.rotateDeg}deg)`,
                    transformOrigin: "0% 50%",
                    boxShadow: "0 0 14px rgba(255,230,180,0.85)",
                    willChange: "transform, opacity",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Warp filler — CSS shooting stars fill blank scroll space */}
        <div
          aria-hidden="true"
          className="relative pointer-events-none"
          style={{ height: isMobile ? "80svh" : "115svh", background: "transparent", overflow: "hidden" }}
        >
          <style>{`
            @keyframes cj-shoot {
              0%   { transform: translateX(0) translateY(0) scaleX(0.3); opacity: 0; }
              10%  { opacity: 1; }
              100% { transform: translateX(-140vw) translateY(60vh) scaleX(1); opacity: 0; }
            }
          `}</style>
          {[
            { top:"9%",  left:"88%", w:90,  delay:"0.00s", dur:"1.60s", angle:-8 },
            { top:"26%", left:"89%", w:113, delay:"0.31s", dur:"1.87s", angle:3  },
            { top:"43%", left:"90%", w:136, delay:"0.62s", dur:"2.14s", angle:-8 },
            { top:"60%", left:"91%", w:159, delay:"0.93s", dur:"2.41s", angle:3  },
            { top:"77%", left:"92%", w:182, delay:"1.24s", dur:"2.68s", angle:-8 },
            { top:"94%", left:"93%", w:205, delay:"1.55s", dur:"2.95s", angle:3  },
            { top:"16%", left:"94%", w:228, delay:"1.86s", dur:"3.22s", angle:-8 },
            { top:"33%", left:"95%", w:251, delay:"2.17s", dur:"3.49s", angle:3  },
            { top:"50%", left:"96%", w:94,  delay:"2.48s", dur:"3.76s", angle:-8 },
            { top:"67%", left:"97%", w:117, delay:"2.79s", dur:"1.83s", angle:3  },
            { top:"84%", left:"98%", w:140, delay:"3.10s", dur:"2.10s", angle:-8 },
            { top:"6%",  left:"99%", w:163, delay:"3.41s", dur:"2.37s", angle:3  },
            { top:"23%", left:"88%", w:186, delay:"0.22s", dur:"2.64s", angle:-8 },
            { top:"40%", left:"89%", w:209, delay:"0.53s", dur:"2.91s", angle:3  },
            { top:"57%", left:"90%", w:232, delay:"0.84s", dur:"3.18s", angle:-8 },
            { top:"74%", left:"91%", w:255, delay:"1.15s", dur:"3.45s", angle:3  },
            { top:"91%", left:"92%", w:98,  delay:"1.46s", dur:"3.72s", angle:-8 },
            { top:"13%", left:"93%", w:121, delay:"1.77s", dur:"1.79s", angle:3  },
            { top:"30%", left:"94%", w:144, delay:"2.08s", dur:"2.06s", angle:-8 },
            { top:"47%", left:"95%", w:167, delay:"2.39s", dur:"2.33s", angle:3  },
            { top:"64%", left:"96%", w:190, delay:"2.70s", dur:"2.60s", angle:-8 },
            { top:"81%", left:"97%", w:213, delay:"3.01s", dur:"2.87s", angle:3  },
            { top:"3%",  left:"98%", w:236, delay:"3.32s", dur:"3.14s", angle:-8 },
            { top:"20%", left:"99%", w:259, delay:"0.13s", dur:"3.41s", angle:3  },
            { top:"37%", left:"88%", w:102, delay:"0.44s", dur:"3.68s", angle:-8 },
            { top:"54%", left:"89%", w:125, delay:"0.75s", dur:"1.75s", angle:3  },
            { top:"71%", left:"90%", w:148, delay:"1.06s", dur:"2.02s", angle:-8 },
            { top:"88%", left:"91%", w:171, delay:"1.37s", dur:"2.29s", angle:3  },
          ].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                top: s.top, left: s.left, width: s.w, height: 1.5,
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
