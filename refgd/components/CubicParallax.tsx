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
        // v23 — once:true. With once:false the entire parallax section
        // re-fades from opacity:0 every time you scroll back into it,
        // momentarily exposing the page background (#04030f) where the
        // section content normally paints — the user-reported "black bar
        // on first scroll where parallax scroll is". One-shot keeps the
        // cinematic 3D entrance but the content stays mounted afterward.
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
