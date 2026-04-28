"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * 3D cosmos warp — a sticky scroll-driven transition that lives between
 * the WELCOME hero and Chapter 01. As the user scrolls into it, the
 * camera "punches through" the cosmos: concentric rings rush outward,
 * a hot white core blooms, and a streaking starfield zooms past the
 * viewer. By the end of the section the warp dims and the eye is
 * delivered cleanly into the chapter below.
 *
 * Pure CSS + framer-motion (no Three.js cost) so it composites well
 * with the global GalaxyBackground sitting underneath.
 */
export default function CosmosWarp() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Core bloom — flares from nothing into a hot white sun then dims.
  const coreScale = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [1, 1, 1] : [0.2, 2.4, 5]);
  const coreOpac = useTransform(scrollYProgress, [0, 0.4, 0.7, 1], [0, 1, 0.65, 0]);

  // Rings — start small at centre, race outward past the camera.
  const ringScale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [0.05, 4.5]);
  const ringOpac = useTransform(scrollYProgress, [0, 0.2, 0.85, 1], [0, 1, 0.4, 0]);

  // Streak field tilts forward, simulating a warp camera punch.
  const streakRotX = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [10, -12]);
  const streakScale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [0.9, 2.4]);
  const streakOpac = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 0.95, 0.85, 0]);

  // Section overlay darkens slightly at the peak, then clears.
  const dim = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.35, 0]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 28 streak lines arranged radially.
  const streaks = Array.from({ length: 28 }, (_, i) => i * (360 / 28));

  return (
    <section
      ref={ref}
      data-testid="cosmos-warp"
      aria-hidden="true"
      className="relative h-[140vh] w-full"
    >
      <div
        className="sticky top-0 grid h-screen w-full place-items-center overflow-hidden"
        style={{ perspective: "1200px" }}
      >
        {/* Local dim so the warp pops against the surrounding bg. */}
        <motion.div
          className="absolute inset-0 bg-black"
          style={mounted ? { opacity: dim } : { opacity: 0 }}
          suppressHydrationWarning
        />

        {/* Streaking starfield — radial spokes pushed forward in 3D. */}
        <motion.div
          className="absolute inset-0 grid place-items-center"
          style={
            mounted
              ? { rotateX: streakRotX, scale: streakScale, opacity: streakOpac, transformStyle: "preserve-3d" }
              : undefined
          }
          suppressHydrationWarning
        >
          <div className="relative h-[120vmin] w-[120vmin]">
            {streaks.map((deg, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 block h-[55vmin] w-[2px] origin-top"
                style={{
                  transform: `translate(-50%, 0) rotate(${deg}deg)`,
                  background:
                    i % 3 === 0
                      ? "linear-gradient(to bottom, rgba(255,237,180,0), rgba(255,237,180,0.95) 35%, rgba(167,139,250,0.6) 75%, transparent)"
                      : i % 3 === 1
                        ? "linear-gradient(to bottom, rgba(123,231,255,0), rgba(123,231,255,0.85) 30%, rgba(123,231,255,0.4) 80%, transparent)"
                        : "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.85) 30%, rgba(244,114,182,0.5) 80%, transparent)",
                  filter: "blur(0.5px)",
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Concentric expanding rings. */}
        <motion.div
          className="absolute inset-0 grid place-items-center"
          style={mounted ? { scale: ringScale, opacity: ringOpac } : undefined}
          suppressHydrationWarning
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="absolute rounded-full"
              style={{
                width: `${n * 18}vmin`,
                height: `${n * 18}vmin`,
                border: `1px solid rgba(255,225,140,${0.55 - n * 0.08})`,
                boxShadow: `inset 0 0 ${n * 14}px rgba(245,185,69,${0.18 - n * 0.025}), 0 0 ${n * 18}px rgba(167,139,250,${0.20 - n * 0.03})`,
              }}
            />
          ))}
        </motion.div>

        {/* Hot core that blooms then dims. */}
        <motion.div
          className="relative h-[18vmin] w-[18vmin] rounded-full"
          style={
            mounted
              ? {
                  scale: coreScale,
                  opacity: coreOpac,
                  background:
                    "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,237,180,0.85) 25%, rgba(245,185,69,0.55) 55%, rgba(167,139,250,0.3) 80%, transparent 100%)",
                  boxShadow:
                    "0 0 200px 80px rgba(255,237,180,0.55), 0 0 400px 120px rgba(167,139,250,0.4)",
                }
              : {
                  background:
                    "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(245,185,69,0.5) 60%, transparent 100%)",
                }
          }
          suppressHydrationWarning
        />
      </div>
    </section>
  );
}
