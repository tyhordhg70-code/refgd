"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { isMobileLike } from "@/lib/iosCheck";

type Props = {
  children: React.ReactNode;
  axis?: "x" | "y" | "both";
  amount?: number;
  rotate?: number;
  depth?: number;
  className?: string;
};

/**
 * Section wrapper that wraps its content in a one-shot 3D parallax
 * entrance — translate + rotate + Z-depth, completing once on
 * viewport entry. On mobile we bypass the 3D context entirely
 * (perspective + preserve-3d) because Chrome Android intermittently
 * drops frames on 3D-context children during scroll-back, painting
 * the section blank for one frame and exposing the page bg as a
 * "black bar" (user-reported v25).
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
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setMobile(isMobileLike()); }, []);

  if (reduce || mobile) {
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
