"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import KineticText from "./KineticText";

/**
 * CosmicJourney — load-once cinematic warp.
 *
 * The full visual richness of the original warp (radial streaks
 * shooting outward, planet bloom, halo pulse, kinetic headline,
 * scroll hint) is back — but the entire scene is now a *self-
 * contained timeline triggered on mount*, not a scroll-driven
 * sticky stage. Think of it as a 3-second cinematic intro that
 * always plays through cleanly:
 *
 *   t=0.00s  nebula backdrop fades up
 *   t=0.10s  warp streaks begin radial expansion from the centre
 *   t=0.30s  central planet starts blooming up from a tiny dot
 *   t=0.80s  halo ring expands outward & pulses once
 *   t=1.60s  WELCOME headline rises in (with KineticText stagger)
 *   t=2.60s  scroll hint fades in
 *   t≥2.8s   ambient state — planet softly breathes, scene holds
 *
 *   ── Why this layout ──────────────────────────────────────────
 *   • Section is exactly `100svh`, normal-flow (NO sticky-pin,
 *     NO scroll-driven `useScroll`/`useSpring`). The user scrolls
 *     past it like any other hero — there is no scroll hijack and
 *     no auto-snap, which means no "abrupt jump" to the paths
 *     section, and scrolling back up never breaks the layout.
 *   • All animation work is opacity + transform on a fixed number
 *     of motion divs. After ~2.8s the timeline finishes and the
 *     scene becomes essentially static aside from a single very
 *     slow ambient pulse on the planet — so there is no sustained
 *     compositor cost like the old scroll-driven version had.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();

  // 36 streaks distributed evenly around the circle, each tagged
  // with a deterministic colour / length / delay so the layout is
  // SSR-stable.
  const streaks = useMemo(() => {
    const colors = ["#ffe28a", "#a78bfa", "#7be7ff", "#f0abfc", "#ffffff"];
    return Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2;
      const reachVw = 60 + ((i * 13) % 40); // % of viewport min-dim
      const dx = Math.cos(angle) * reachVw;
      const dy = Math.sin(angle) * reachVw;
      const rotateDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      return {
        dx, // % vmin
        dy, // % vmin
        rotateDeg,
        color: colors[i % colors.length],
        width: 1 + (i % 3),
        length: 70 + (i % 6) * 18, // px
        delay: 0.1 + (i % 14) * 0.04,
      };
    });
  }, []);

  return (
    <section
      data-testid="cosmic-journey"
      className="relative grid w-full place-items-center overflow-hidden"
      style={{
        height: "100svh",
        contain: "layout paint",
        transform: "translate3d(0,0,0)",
      }}
    >
      {/* ── 1. Nebula backdrop — fades in over the first second. ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 1.2, ease: "easeOut" }}
        style={{
          background:
            "radial-gradient(ellipse at 28% 32%, rgba(167,139,250,0.50) 0%, transparent 45%)," +
            "radial-gradient(ellipse at 75% 60%, rgba(34,211,238,0.42) 0%, transparent 50%)," +
            "radial-gradient(ellipse at 50% 80%, rgba(245,185,69,0.35) 0%, transparent 50%)",
          filter: "blur(40px)",
        }}
        suppressHydrationWarning
      />

      {/* ── 2. Warp streaks — radial expansion outward from centre. ── */}
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

      {/* ── 3. Central planet — blooms up from a tiny dot. ── */}
      <motion.div
        className="absolute h-[60vmin] w-[60vmin] rounded-full"
        initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.18 }}
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

      {/* ── 3b. Slow ambient pulse on planet — kicks in *after* the
              warp finishes so it doesn't interfere with the bloom. ── */}
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

      {/* ── 4. Halo ring — expands outward & holds a soft glow. ── */}
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="absolute h-[88vmin] w-[88vmin] rounded-full"
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: [0, 0.75, 0.40], scale: 1 }}
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

      {/* ── 5. WELCOME headline — rises in over the planet. ── */}
      <motion.div
        className="container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center"
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 32, scale: 0.95 }}
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

      {/* ── 6. Scroll hint — fades in last so the user knows what to do. ── */}
      <motion.div
        className="absolute bottom-12 z-[6] flex flex-col items-center gap-3 text-white"
        data-testid="hero-scroll-indicator"
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
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
    </section>
  );
}
