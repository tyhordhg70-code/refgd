"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * RevealImage — nomoolabs.com / lusion-style image entrance.
 *
 * Wraps any image (or any block, really) and gives it a clip-path
 * "curtain" reveal as soon as it scrolls into view. Combined with a
 * subtle scale-down (1.06 → 1) so the image "settles into place"
 * the way nomoolabs/lusion image cards do.
 *
 * Hard rules learned from production bugs:
 *
 *   – Under prefers-reduced-motion this component renders the bare
 *     children with NO wrapper, NO animation, NO inserted layout box.
 *     This is the fix for the user-reported "images misaligned on
 *     evade and storelist pages" bug — the previous wrapper div was
 *     disrupting the parent's flex/grid layout for reduced-motion
 *     users (who happen to be the user reporting the bug).
 *
 *   – `opacity` NEVER animates from 0. clip-path alone is the reveal.
 *     If the IntersectionObserver never fires (slow connection, async
 *     mount, element starts past the trigger threshold) the image is
 *     still fully visible — it just doesn't get the curtain animation.
 *     Animating opacity from 0 was the root cause of "image stays
 *     invisible forever" reports.
 *
 *   – `viewport.amount` is 0.0 (any pixel triggers it) and we add
 *     a 20% bottom rootMargin so even partial visibility triggers
 *     the reveal. Combined with `once: true` this means once the
 *     element has been seen, it stays visible.
 *
 * Usage:
 *   <RevealImage from="left" className="…">
 *     <img src="…" alt="…" />
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

  // Reduced-motion: bare children. No wrapper means parent flex/grid
  // sees the original child element directly, no layout drift.
  if (reduced) {
    return <>{children}</>;
  }

  // Each direction: clip-path that fully hides the content collapsed
  // against the OPPOSITE edge — the curtain pulls AWAY from `from`.
  const initials = {
    left: { clipPath: "inset(0% 100% 0% 0%)" },
    right: { clipPath: "inset(0% 0% 0% 100%)" },
    top: { clipPath: "inset(0% 0% 100% 0%)" },
    bottom: { clipPath: "inset(100% 0% 0% 0%)" },
  } as const;

  return (
    <motion.div
      className={className}
      initial={{ ...initials[from], scale: 1.06 }}
      whileInView={{
        clipPath: "inset(0% 0% 0% 0%)",
        scale: 1,
      }}
      viewport={{ once: true, amount: 0, margin: "0px 0px -5% 0px" }}
      transition={{
        duration: durationMs / 1000,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ willChange: "clip-path, transform" }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}
