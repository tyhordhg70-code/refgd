"use client";

import { Suspense, lazy, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

const Spline = lazy(() => import("@splinetool/react-spline"));

type Props = {
  scene?: string;
  className?: string;
  /** Tailwind height class. */
  height?: string;
  /** Final post-blend opacity of the scene (0..1). */
  opacity?: number;
  /** Kept for API compat — ignored; use `scrollRotate`. */
  drift?: number;
  /**
   * When true the model performs a full 180° Y rotation linked to scroll
   * progress as the user passes through this section, plus a zoom-in
   * arc that peaks in the middle of the section.
   */
  scrollRotate?: boolean;
};

/**
 * Ambient transparent Spline panel.
 *
 *  – `mix-blend-mode: screen` on the wrapper plus a multiply
 *    "subtractor" neutralises the Spline's baked white background,
 *    leaving the saturated machinery floating over the cosmic page.
 *  – When `scrollRotate` is on, the model performs a single 180° Y
 *    rotation across the section's scroll, with a zoom-in arc.
 */
export default function SplineScene({
  scene = "https://prod.spline.design/t1cRPSuUYdk8wCF9/scene.splinecode",
  className = "",
  height = "h-[680px]",
  opacity = 0.7,
  scrollRotate = false,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rotateY = useTransform(
    scrollYProgress,
    [0, 1],
    scrollRotate && !reduce ? [-90, 90] : [0, 0],
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    scrollRotate && !reduce ? [0.85, 1.18, 0.92] : [0.95, 1, 1.05],
  );
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -60]);

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden bg-transparent ${height} ${className}`}
      aria-hidden="true"
      data-testid="spline-scene"
    >
      <motion.div
        style={{
          y,
          scale,
          rotateY,
          opacity,
          mixBlendMode: "screen",
          width: "140%",
          height: "140%",
          marginLeft: "-20%",
          marginTop: "-12%",
          filter: "saturate(1.25) contrast(1.05)",
          transformStyle: "preserve-3d",
          perspective: 1400,
        }}
        className="absolute inset-0"
        suppressHydrationWarning
      >
        {/* Multiply blanket neutralises the bright Spline background */}
        <div
          className="absolute inset-0"
          style={{
            background: "#05060a",
            mixBlendMode: "multiply",
          }}
        />
        <div style={{ width: "100%", height: "100%" }}>
          <Suspense fallback={null}>
            <Spline scene={scene} />
          </Suspense>
        </div>
      </motion.div>
      {/* soft edge feathering */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(5,6,10,0.45) 100%)",
        }}
      />
    </div>
  );
}
