"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import { useRef, type ReactNode } from "react";

  /**
   * Section reveal with 3D tilt + lift.
   *
   * v6.14.2 — Removed opacity from initial/whileInView. Content is
   * always fully visible so framer-motion hydration timing never leaves
   * sections blank. Only transform (y, rotateX, scale) animates.
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
        initial={{ y: 60 * intensity, rotateX: 18 * intensity, scale: 0.97 }}
        whileInView={{ y: 0, rotateX: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transformPerspective: 1400,
          transformStyle: "preserve-3d",
          willChange: "transform",
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
        initial={{ y: amount * 0.6, rotate: -2 }}
        whileInView={{ y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "relative" }}
        suppressHydrationWarning
        className={className}
      >
        {children}
      </motion.div>
    );
  }
  