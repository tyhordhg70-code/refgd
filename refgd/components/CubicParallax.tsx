"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  children: React.ReactNode;
  /** Translation axis — kept for API compat, no longer used. */
  axis?: "x" | "y" | "both";
  /** Pixel amount of entrance drift. */
  amount?: number;
  /** Degrees of 3D rotation on entrance. */
  rotate?: number;
  /** Z-depth shift in pixels on entrance. */
  depth?: number;
  className?: string;
};

/**
 * Section wrapper that wraps its content in a one-shot 3D parallax
 * entrance — translate + rotate + Z-depth, all completing once on
 * viewport entry. No scroll-linked transforms (which were laggy and
 * froze mid-scroll).
 *
 * v36 — HARDCODED RULE: viewport.once = true.
 *
 * Earlier versions had `once: false`, which meant every time the
 * user scrolled an already-revealed section BACK into view (e.g. on
 * upward scroll past a section they'd already passed), framer-motion
 * re-fired the `initial` state (opacity:0, translated, rotated,
 * pushed back in Z) before re-animating to `whileInView`. That is
 * the "text vanishes on backscroll" bug the user reported across
 * every page of refgd.onrender.com.
 *
 * Setting `once: true` makes the entrance animation fire EXACTLY
 * once per element per page load. The animation itself is fully
 * preserved — the section still flies in with the 3D parallax
 * entrance the first time it enters the viewport. It just never
 * vanishes again afterward.
 *
 * Do NOT change `once` back to `false`. The whole point of this
 * wrapper is a ONE-SHOT entrance.
 */
export default function CubicParallax({
  children,
  axis = "y",
  amount = 40,
  rotate = 4,
  depth = 60,
  className = "",
}: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} data-testid="cubic-parallax">
        {children}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ perspective: 1600 }}
      data-testid="cubic-parallax"
    >
      <motion.div
        initial={{
          x: axis === "x" || axis === "both" ? amount : 0,
          y: axis === "y" || axis === "both" ? amount : 0,
          rotateX: rotate,
          rotateY: -rotate,
          z: -depth,
          opacity: 0,
        }}
        whileInView={{
          x: 0,
          y: 0,
          rotateX: 0,
          rotateY: 0,
          z: 0,
          opacity: 1,
        }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform, opacity",
        }}
        suppressHydrationWarning
      >
        {children}
      </motion.div>
    </div>
  );
}
