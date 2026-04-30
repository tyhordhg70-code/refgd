"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * VanishWrapper — wraps a block of cards / content so it fades IN
 * as it enters the viewport, holds visible while in view, and fades
 * BACK OUT as it exits. On scroll reverse, the cycle plays in reverse,
 * so the block "vanishes and reappears" as the user moves up and down.
 *
 * The opacity / scale curve is keyed off the wrapper's own scroll
 * progress (0 → 1 across [start end] → [end start]):
 *   0.00 → 0.18 : fade IN
 *   0.18 → 0.78 : fully visible
 *   0.78 → 1.00 : fade OUT
 *
 * Combined with a slight scale + Y drift so the entrance / exit feel
 * physical instead of a flat alpha cut.
 */
export default function VanishWrapper({
  children,
  className = "",
  /** How much vertical drift on entry/exit, in pixels. */
  drift = 36,
  /** Minimum scale at the fade-in / fade-out edges. */
  minScale = 0.94,
}: {
  children: ReactNode;
  className?: string;
  drift?: number;
  minScale?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.18, 0.78, 1],
    [0, 1, 1, 0]
  );
  const y = useTransform(
    scrollYProgress,
    [0, 0.18, 0.78, 1],
    [drift, 0, 0, -drift]
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.18, 0.78, 1],
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
