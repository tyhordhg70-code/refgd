"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * Section reveal with 3D tilt + parallax. Wrap any block to give it
 * an immersive scroll-driven entrance.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: 8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
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

export function ParallaxBlock({
  children,
  amount = 60,
  className = "",
}: { children: React.ReactNode; amount?: number; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  return (
    <motion.div ref={ref} style={{ y, position: "relative" }} suppressHydrationWarning className={className}>
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
