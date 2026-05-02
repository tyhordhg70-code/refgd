"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * VanishWrapper — soft fade-in / fade-out wrapper.
 *
 * History: previous version drove opacity all the way to 0 at the
 * scroll-progress extremes (0 and 1). For TALL content blocks on the
 * mentorship page (e.g. "What's Included" with a sticky illustration
 * column on the left and a long BounceList on the right) the wrapper's
 * scroll progress reached the edges of [start end] / [end start] WHILE
 * the cards were still in the visible viewport, so they "vanished and
 * reappeared" mid-scroll. The fade was correct mathematically but
 * read to the user as a rendering bug.
 *
 * Fix: keep the parallax motion but never let opacity drop below 0.85.
 * The block now glides in/out with a subtle drift+scale, but stays
 * fully readable the entire time. Cards no longer disappear when the
 * sticky column re-pins. If you really want a vanish, pass
 * `minOpacity={0}` explicitly.
 */
export default function VanishWrapper({
  children,
  className = "",
  /** How much vertical drift on entry/exit, in pixels. */
  drift = 24,
  /** Minimum scale at the fade-in / fade-out edges. */
  minScale = 0.97,
  /** Minimum opacity at the fade-in / fade-out edges (0–1). */
  minOpacity = 0.85,
}: {
  children: ReactNode;
  className?: string;
  drift?: number;
  minScale?: number;
  minOpacity?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [minOpacity, 1, 1, minOpacity]
  );
  const y = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [drift, 0, 0, -drift]
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [minScale, 1, 1, minScale]
  );

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y, scale, willChange: "opacity, transform" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
