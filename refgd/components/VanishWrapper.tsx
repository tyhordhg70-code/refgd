"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";

/**
 * VanishWrapper — one-shot scroll-into-view ENTRANCE.
 *
 * v38 — restore the full fade + rise + scale entrance on mobile too
 * (was downgraded to opacity-only in v21). viewport.once stays true, so
 * the section plays its entrance exactly once as it scrolls in and then
 * latches — it never re-hides on backscroll.
 */
export default function VanishWrapper({
  children,
  className = "",
  drift = 36,
  minScale = 0.94,
}: {
  children: ReactNode;
  className?: string;
  drift?: number;
  minScale?: number;
}) {
  const reduce = useReducedMotion();
  const entranceReady = useEntranceReady();

  if (reduce) return <div className={className}>{children}</div>;

  // v45 — DO NOT animate opacity here. These wrappers contain glass rows
  // (BounceList) whose `backdrop-filter` samples the page behind them. An
  // ancestor animating opacity 0→1 flattens this whole subtree into a group
  // buffer, so during the entrance the glass rows' backdrop samples an EMPTY
  // buffer and the cards visibly VANISH, then snap back when opacity hits 1.
  // Keeping only y + scale (transforms, which do NOT create an opacity group)
  // preserves the rise/scale entrance with no backdrop flash.
  const initial = { y: drift, scale: minScale };
  const target = { y: 0, scale: 1 };

  return (
    <motion.div
      className={className}
      initial={initial}
      {...(entranceReady
        ? {
            whileInView: target,
            viewport: { once: true, margin: "0px 0px -10% 0px" },
          }
        : {})}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}
