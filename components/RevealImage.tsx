"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * RevealImage — nomoolabs.com / lusion-style image entrance.
 *
 * Wraps any image (or any block, really — children can be anything)
 * and gives it a horizontal clip-path mask reveal as soon as it
 * scrolls into view. The reveal looks like a curtain sliding from
 * the chosen edge, exposing the image underneath. Combined with a
 * tiny scale-down (1.06 → 1) so the image "settles into place"
 * the way nomoolabs/lusion image cards do.
 *
 * Reduced-motion users see the image instantly with no transform —
 * because masking + transform under prefers-reduced-motion has been
 * the source of multiple "blank zone" production bugs in this app.
 *
 * Usage:
 *   <RevealImage from="left">
 *     <img src="…" alt="…" className="…" />
 *   </RevealImage>
 */
export default function RevealImage({
  children,
  from = "bottom",
  delay = 0,
  className = "",
  durationMs = 1100,
}: {
  children: ReactNode;
  /** Edge the curtain slides FROM. */
  from?: "left" | "right" | "top" | "bottom";
  delay?: number;
  className?: string;
  durationMs?: number;
}) {
  const reduced = useReducedMotion();

  // Each direction has a clip-path that fully hides the content
  // (inset 100%) collapsed against the OPPOSITE edge — the curtain
  // pulls AWAY from `from`.
  const initials = {
    left:   { clipPath: "inset(0% 100% 0% 0%)" },
    right:  { clipPath: "inset(0% 0% 0% 100%)" },
    top:    { clipPath: "inset(0% 0% 100% 0%)" },
    bottom: { clipPath: "inset(100% 0% 0% 0%)" },
  } as const;

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ ...initials[from], scale: 1.06, opacity: 0.0 }}
      whileInView={{
        clipPath: "inset(0% 0% 0% 0%)",
        scale: 1,
        opacity: 1,
      }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -8% 0px" }}
      transition={{
        duration: durationMs / 1000,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ willChange: "clip-path, transform, opacity" }}
      suppressHydrationWarning
      className={className}
    >
      {children}
    </motion.div>
  );
}
