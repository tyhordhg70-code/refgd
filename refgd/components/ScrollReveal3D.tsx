"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Section reveal with 3D tilt + lift. Was previously scroll-driven
 * (useScroll + useTransform), which made every section require
 * continuous scrolling to complete its entrance and pinned a heavy
 * compositor cost. Now it's a one-shot viewport-triggered tilt that
 * settles flat in ~0.9s — stop-motion feel, single scroll completes.
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

  if (reduced) {
    return (
      <div ref={ref} className={className} style={{ position: "relative" }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.6, y: 60 * intensity, rotateX: 18 * intensity, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{
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

/** Image that lifts on viewport entry — for hero illustrations. */
export function ScrollFloatImage({
  children,
  amount = 80,
  className = "",
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className} style={{ position: "relative" }}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: amount, rotate: -3 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "relative" }}
      suppressHydrationWarning
      className={className}
    >
      {children}
    </motion.div>
  );
}
