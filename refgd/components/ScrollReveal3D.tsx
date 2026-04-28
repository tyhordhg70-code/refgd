"use client";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Scroll-driven 3D reveal: as the section enters the viewport, it tilts /
 * lifts up and snaps to flat once centered. Cheap to render — uses CSS
 * transform only, GPU-accelerated.
 */
export default function ScrollReveal3D({
  children,
  className = "",
  intensity = 1,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [18 * intensity, 0, -10 * intensity]);
  const y       = useTransform(scrollYProgress, [0, 0.5, 1], [60 * intensity, 0, -40 * intensity]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.6, 1, 1, 0.85]);
  const scale   = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1, 0.98]);

  if (reduced) {
    // `position: relative` so framer-motion's useScroll target check
    // doesn't warn — the ref'd element must be non-static.
    return (
      <div ref={ref} className={className} style={{ position: "relative" }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      style={{
        rotateX,
        y,
        opacity,
        scale,
        transformPerspective: 1400,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
        position: "relative",
      }}
      suppressHydrationWarning
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Image that floats with scroll progress — for hero illustrations. */
export function ScrollFloatImage({
  children,
  amount = 80,
  className = "",
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-3, 3]);
  return (
    <motion.div
      ref={ref}
      style={{ y, rotate, position: "relative" }}
      suppressHydrationWarning
      className={className}
    >
      {children}
    </motion.div>
  );
}
