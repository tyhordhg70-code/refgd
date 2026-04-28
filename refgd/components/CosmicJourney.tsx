"use client";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import KineticText from "./KineticText";
import LiquidGlassOrbs from "./LiquidGlassOrbs";

/**
 * CosmicJourney — the master 3D storytelling scene.
 *
 * SCROLL-DRIVEN ARC. The animation is mapped to the user's scroll
 * position over a 200svh runway with a sticky 100svh inner stage:
 *
 *   • At scroll = 0  → WELCOME holds, no warp. Page looks "still".
 *   • First scroll   → planet zooms past, rings explode outward.
 *   • Mid runway     → tunnel travel + core bloom peak.
 *   • End of runway  → emergence, nebula resolves, paths section
 *                       comes into view directly underneath.
 *
 * Because progress is bound to scroll, scrolling BACK UP reverses
 * the entire scene, so the WELCOME headline returns when the user
 * scrolls back to the top — no longer "lost forever" the first time
 * they pass through it.
 *
 *   Phase 0   0.00 → 0.18  •  WELCOME holds. Planet glows. Stars drift.
 *   Phase 1   0.18 → 0.45  •  Camera punches forward. Planet zooms past,
 *                            orbital rings race outward.
 *   Phase 2   0.45 → 0.72  •  Tunnel travel. Warp speed, deep core bloom.
 *   Phase 3   0.72 → 1.00  •  Emergence. Streaks slow, nebula resolves.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Mouse parallax (desktop only) ─────────────────────────
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), {
    stiffness: 90,
    damping: 22,
  });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), {
    stiffness: 90,
    damping: 22,
  });
  const transX = useSpring(useTransform(mx, [-0.5, 0.5], [-22, 22]), {
    stiffness: 70,
    damping: 22,
  });
  const transY = useSpring(useTransform(my, [-0.5, 0.5], [-16, 16]), {
    stiffness: 70,
    damping: 22,
  });

  useEffect(() => {
    if (reduced || isMobile) return;
    const el = sceneRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => {
      mx.set(0);
      my.set(0);
    };
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced, isMobile, mx, my]);

  // ── Scroll-driven master timeline ─────────────────────────
  // Progress maps from 0 → 1 across the 200svh section. While the
  // user is at the very top, progress is 0 → WELCOME stays. As they
  // scroll, the scene plays through. Scrolling back up reverses it.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // Smooth the raw scroll progress so phase transitions feel cinematic
  // instead of snapping with every scroll tick.
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  // PLANET — visible early, then zooms past the camera and dissolves.
  const planetScale = useTransform(
    progress,
    [0, 0.18, 0.42, 0.6],
    reduced ? [1, 1, 1, 1] : isMobile ? [1, 1.05, 2.0, 4.2] : [1, 1.05, 2.6, 6],
  );
  const planetY = useTransform(
    progress,
    [0, 0.5],
    reduced ? ["0%", "0%"] : isMobile ? ["0%", "30%"] : ["0%", "55%"],
  );
  const planetOpacity = useTransform(
    progress,
    [0, 0.18, 0.45, 0.6],
    [1, 1, 0.55, 0],
  );

  // RINGS — collapse inward then explode outward as the warp ignites.
  const ringScale = useTransform(
    progress,
    [0, 0.18, 0.45, 0.7],
    reduced ? [1, 1, 1, 1] : isMobile ? [1, 0.7, 2.6, 4.5] : [1, 0.6, 3.6, 6.5],
  );
  const ringOpacity = useTransform(
    progress,
    [0, 0.18, 0.45, 0.7, 0.85],
    [0.9, 0.95, 0.9, 0.4, 0],
  );
  const ringRot = useTransform(
    progress,
    [0, 1],
    reduced ? [0, 0] : [0, 220],
  );

  // CORE BLOOM — the heart of the warp. Flares between phase 1 → 2.
  const coreScale = useTransform(
    progress,
    [0, 0.2, 0.5, 0.8, 1],
    reduced ? [0, 0, 1, 1, 1] : isMobile ? [0, 0, 1.6, 3.4, 5] : [0, 0, 1.8, 4.2, 7],
  );
  const coreOpacity = useTransform(
    progress,
    [0, 0.25, 0.5, 0.78, 1],
    [0, 0, 1, 0.55, 0],
  );

  // STREAK FIELD — radial light spokes that accelerate outward.
  const streakScale = useTransform(
    progress,
    [0, 0.18, 1],
    reduced ? [1, 1, 1] : isMobile ? [0.7, 1.1, 3.4] : [0.6, 1.1, 4.2],
  );
  const streakOpacity = useTransform(
    progress,
    [0, 0.18, 0.4, 0.78, 1],
    [0, 0.4, 1, 0.85, 0.0],
  );
  const streakRotX = useTransform(
    progress,
    [0, 1],
    reduced ? [0, 0] : [6, -10],
  );

  // DISTANT NEBULA — the destination. Brightens as we arrive.
  const nebulaOpacity = useTransform(
    progress,
    [0, 0.55, 0.78, 1],
    [0, 0.2, 0.95, 0.7],
  );
  const nebulaScale = useTransform(
    progress,
    [0, 1],
    reduced ? [1, 1] : isMobile ? [1.1, 1] : [1.3, 0.95],
  );

  // KICKER TEXT — sits proudly through phase 0, then accelerates away
  // into the warp. Scrolling back up reverses this so WELCOME returns.
  const textY = useTransform(
    progress,
    [0, 0.18, 0.4],
    reduced ? ["0%", "0%", "0%"] : isMobile ? ["0%", "-3%", "-12%"] : ["0%", "-6%", "-30%"],
  );
  const textScale = useTransform(
    progress,
    [0, 0.18, 0.45],
    reduced ? [1, 1, 1] : isMobile ? [1, 1.02, 1.18] : [1, 1.04, 1.8],
  );
  const textOpacity = useTransform(
    progress,
    [0, 0.18, 0.32, 0.42],
    [1, 1, 0.55, 0],
  );

  // SCROLL HINT — fades out as soon as the warp begins.
  const hintOpacity = useTransform(progress, [0, 0.04, 0.12], [1, 0.7, 0]);

  // VIGNETTE — slight darken at peak warp keeps the bloom punchy.
  const vignette = useTransform(
    progress,
    [0, 0.45, 0.75, 1],
    [0, 0.45, 0.25, 0],
  );

  // Streak spokes — fewer on mobile keeps the GPU compositing budget sane.
  const streakCount = isMobile ? 22 : 32;
  const streaks = Array.from({ length: streakCount }, (_, i) => i * (360 / streakCount));

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative w-full"
      style={{
        // 200svh runway → sticky inner stage plays the scene as the
        // user scrolls through. Scrolling back up REVERSES it, so the
        // WELCOME headline returns when they reach the top.
        height: "200svh",
      }}
    >
      <div
        className="sticky top-0 h-[100svh] w-full"
        style={{
          // Force a dedicated compositor layer for the entire scene.
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      >
        <div
          ref={sceneRef}
          className="grid h-full w-full place-items-center overflow-hidden"
          style={{
            perspective: isMobile ? "900px" : "1500px",
            contain: "layout paint",
          }}
          data-cursor="big"
          data-cursor-label="explore"
        >
          {/* Layer 0 — sparse glassy orbs as ambient depth. */}
          <LiquidGlassOrbs count={isMobile ? 5 : 7} className="z-[1]" />

          {/* Layer 1 — distant nebula (far). Gradients only, very cheap. */}
          <motion.div
            className="absolute inset-0 z-[2]"
            style={
              mounted
                ? { opacity: nebulaOpacity, scale: nebulaScale }
                : { opacity: 0 }
            }
            suppressHydrationWarning
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 28% 32%, rgba(167,139,250,0.55) 0%, transparent 45%)," +
                  "radial-gradient(ellipse at 75% 60%, rgba(34,211,238,0.45) 0%, transparent 50%)," +
                  "radial-gradient(ellipse at 50% 80%, rgba(245,185,69,0.35) 0%, transparent 50%)",
                filter: "blur(40px)",
              }}
            />
          </motion.div>

          {/* Layer 2 — vignette dimmer at warp peak. */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[3] bg-black"
            style={mounted ? { opacity: vignette } : { opacity: 0 }}
            suppressHydrationWarning
          />

          {/* Layer 3 — radial streak field (warp). 3D tilted plane. */}
          <motion.div
            className="absolute inset-0 z-[4] grid place-items-center"
            style={
              mounted
                ? {
                    opacity: streakOpacity,
                    scale: streakScale,
                    rotateX: streakRotX,
                    transformStyle: "preserve-3d",
                  }
                : { opacity: 0 }
            }
            suppressHydrationWarning
          >
            <div className="relative h-[140vmin] w-[140vmin]">
              {streaks.map((deg, i) => (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 block h-[60vmin] w-[2px] origin-top"
                  style={{
                    transform: `translate(-50%, 0) rotate(${deg}deg)`,
                    background:
                      i % 3 === 0
                        ? "linear-gradient(to bottom, rgba(255,237,180,0), rgba(255,237,180,0.95) 30%, rgba(167,139,250,0.6) 75%, transparent)"
                        : i % 3 === 1
                        ? "linear-gradient(to bottom, rgba(123,231,255,0), rgba(123,231,255,0.85) 26%, rgba(123,231,255,0.4) 80%, transparent)"
                        : "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.85) 28%, rgba(244,114,182,0.5) 80%, transparent)",
                    filter: "blur(0.5px)",
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Layer 4 — orbital rings expanding outward. */}
          <motion.div
            className="absolute inset-0 z-[5] grid place-items-center"
            style={
              mounted
                ? { scale: ringScale, opacity: ringOpacity, rotate: ringRot }
                : { opacity: 0 }
            }
            suppressHydrationWarning
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="absolute rounded-full"
                style={{
                  width: `${n * 16}vmin`,
                  height: `${n * 16}vmin`,
                  border: `1px solid rgba(255,225,140,${0.55 - n * 0.08})`,
                  boxShadow: `inset 0 0 ${n * 14}px rgba(245,185,69,${
                    0.18 - n * 0.025
                  }), 0 0 ${n * 18}px rgba(167,139,250,${0.2 - n * 0.03})`,
                }}
              />
            ))}
          </motion.div>

          {/* Layer 5 — the planet itself, with full mouse parallax. */}
          <motion.div
            className="absolute inset-0 z-[6] grid place-items-center"
            style={
              mounted
                ? {
                    scale: planetScale,
                    y: planetY,
                    opacity: planetOpacity,
                  }
                : { opacity: 1 }
            }
            suppressHydrationWarning
          >
            <motion.div
              style={{
                rotateX: reduced || isMobile ? 0 : rotX,
                rotateY: reduced || isMobile ? 0 : rotY,
                x: reduced || isMobile ? 0 : transX,
                y: reduced || isMobile ? 0 : transY,
                transformStyle: "preserve-3d",
                willChange: "transform",
              }}
              suppressHydrationWarning
              className="relative h-[60vmin] w-[60vmin]"
            >
              {/* Living planet body — slow auto-rotation. */}
              <motion.div
                className="absolute inset-[18%] rounded-full"
                animate={reduced ? {} : { rotate: 360 }}
                transition={
                  reduced
                    ? {}
                    : { duration: 90, repeat: Infinity, ease: "linear" }
                }
                style={{
                  background:
                    "radial-gradient(circle at 30% 28%, rgba(255,237,180,1) 0%, rgba(245,185,69,0.85) 22%, rgba(167,139,250,0.62) 55%, rgba(34,211,238,0.32) 85%, transparent 100%)," +
                    "radial-gradient(circle at 70% 78%, rgba(167,139,250,0.55), transparent 60%)," +
                    "radial-gradient(circle at 22% 80%, rgba(34,211,238,0.45), transparent 55%)",
                  boxShadow:
                    "0 0 140px 50px rgba(245,185,69,0.40), 0 0 260px 90px rgba(167,139,250,0.28), inset 0 0 80px rgba(255,255,255,0.5)",
                }}
              />
              {/* Solar flare highlight */}
              <motion.div
                className="absolute inset-[18%] rounded-full"
                animate={
                  reduced ? {} : { opacity: [0.5, 0.95, 0.5], scale: [1, 1.05, 1] }
                }
                transition={
                  reduced
                    ? {}
                    : { duration: 6, repeat: Infinity, ease: "easeInOut" }
                }
                style={{
                  background:
                    "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.0) 28%)",
                  mixBlendMode: "screen",
                }}
              />

              {/* Orbiting accent moons. */}
              {[
                { d: 0, color: "#ffe28a", radiusVmin: 26, dur: 18 },
                { d: -3, color: "#a78bfa", radiusVmin: 30, dur: 22 },
                { d: -6, color: "#67e8f9", radiusVmin: 22, dur: 16 },
                { d: -9, color: "#f472b6", radiusVmin: 34, dur: 26 },
              ].map((o, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 block h-0 w-0"
                  style={{
                    animation: reduced
                      ? "none"
                      : `spin ${o.dur}s linear ${o.d}s infinite`,
                    transformOrigin: "center",
                  }}
                >
                  <span
                    className="absolute block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background: o.color,
                      boxShadow: `0 0 18px ${o.color}, 0 0 50px ${o.color}`,
                      top: `-${o.radiusVmin}vmin`,
                      left: 0,
                    }}
                  />
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Layer 6 — hot core bloom (peak of warp). */}
          <motion.div
            className="absolute z-[7] aspect-square w-[16vmin] rounded-full"
            style={
              mounted
                ? {
                    scale: coreScale,
                    opacity: coreOpacity,
                    background:
                      "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,237,180,0.85) 22%, rgba(245,185,69,0.55) 50%, rgba(167,139,250,0.3) 80%, transparent 100%)",
                    boxShadow:
                      "0 0 200px 80px rgba(255,237,180,0.55), 0 0 400px 120px rgba(167,139,250,0.4)",
                  }
                : { opacity: 0 }
            }
            suppressHydrationWarning
          />

          {/* Layer 7 — kicker / WELCOME headline. */}
          <motion.div
            className="container-wide pointer-events-none relative z-[8] flex h-full flex-col items-center justify-center text-center"
            style={
              mounted
                ? { y: textY, scale: textScale, opacity: textOpacity }
                : undefined
            }
            suppressHydrationWarning
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.1, ease: [0.25, 0.4, 0.25, 1] }}
              suppressHydrationWarning
              className="mx-auto inline-block px-2"
            >
              <KineticText
                as="h1"
                text={kicker}
                className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
                style={{
                  textShadow:
                    "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)",
                }}
                stagger={0.1}
                delay={0.1}
              />
            </motion.div>

            <motion.div
              style={mounted ? { opacity: hintOpacity } : { opacity: 1 }}
              suppressHydrationWarning
              className="mt-14 flex flex-col items-center gap-3 text-white"
              data-testid="hero-scroll-indicator"
            >
              <span
                className="heading-display text-xs font-bold uppercase tracking-[0.5em] text-white sm:text-sm"
                style={{
                  textShadow:
                    "0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,237,180,0.65), 0 0 4px rgba(0,0,0,0.9)",
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
        </div>
      </div>
    </section>
  );
}
