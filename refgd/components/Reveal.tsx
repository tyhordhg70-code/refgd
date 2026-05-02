"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Section reveal with 3D tilt + parallax. Wrap any block to give it
 * an immersive scroll-driven entrance.
 *
 * IMPORTANT: this used to ship `initial:{opacity:0,…}` with
 * `viewport:{ once:false }` and NO reduced-motion fallback. That
 * combination caused two real bugs in production:
 *
 *   1. Users with `prefers-reduced-motion: reduce` saw entire body
 *      sections (e.g. the storelist hero card body, mentorships
 *      tagline paragraphs) stay invisible at opacity 0 forever
 *      because framer-motion v11 still respects `initial` even
 *      when its built-in reduced-motion handling is disabled.
 *   2. With `once:false`, content re-hid every time the viewport
 *      scrolled past the block — full-page screenshots and any
 *      back-scroll left blocks invisible.
 *
 * Now: reduced-motion users get content rendered straight at
 * opacity 1 with no transform. Everyone else gets the entrance
 * once and only once.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 60, rotateX: 8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.10 }}
      transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200 }}
      // framer-motion `initial` styles serialise to a `style="…"` attribute
      // on SSR and the client formats the same values slightly differently
      // on first paint — visually identical, just a different string.
      suppressHydrationWarning
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Block that lifts into place on viewport entry (was scroll-driven). */
export function ParallaxBlock({
  children,
  amount = 60,
  className = "",
}: { children: React.ReactNode; amount?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: amount }}
      whileInView={{ opacity: 1, y: 0 }}
      // once:true — prevents the same re-hide bug Reveal had above:
      // ParallaxBlock used to fire `whileInView` on every entry/exit
      // boundary which left content invisible on back-scroll under
      // throttling and prefers-reduced-motion.
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
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
