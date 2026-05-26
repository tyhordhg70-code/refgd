"use client";
  import { motion, useReducedMotion } from "framer-motion";

  /**
   * Section reveal with 3D tilt + lift.
   *
   * v6.14.2 — Removed opacity from initial/whileInView states.
   * Content is always visible (no opacity:0 flash if framer-motion
   * is slow to hydrate). Only transform (y + rotateX) animates.
   * The lift-into-place effect is fully preserved.
   */
  export function Reveal({
    children,
    delay = 0,
    className = "",
  }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
      <motion.div
        initial={{ y: 50, rotateX: 6 }}
        whileInView={{ y: 0, rotateX: 0 }}
        viewport={{ once: false, amount: 0.1 }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ perspective: 1200 }}
        suppressHydrationWarning
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  /** Block that lifts into place on viewport entry. */
  export function ParallaxBlock({
    children,
    amount = 60,
    className = "",
  }: { children: React.ReactNode; amount?: number; className?: string }) {
    const reduced = useReducedMotion();
    return (
      <motion.div
        initial={reduced ? {} : { y: amount * 0.6 }}
        whileInView={{ y: 0 }}
        viewport={{ once: false, amount: 0.1 }}
        transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "relative" }}
        suppressHydrationWarning
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  /** Simple gradient orb for backgrounds */
  export function Orb({
    className = "",
    color = "rgba(245,185,69,0.35)",
  }: { className?: string; color?: string }) {
    return (
      <div
        aria-hidden="true"
        className={`absolute rounded-full blur-3xl ${className}`}
        style={{ background: color }}
      />
    );
  }
  