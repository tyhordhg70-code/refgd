"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";
import { isMobileLike } from "@/lib/iosCheck";

/**
 * VanishWrapper — cinematic scroll-into-view entrance.
 *
 * v28 — on mobile, the entrance plays on mount via `animate` instead
 * of waiting for an IntersectionObserver. The IO path was leaving
 * children stranded invisible on Chrome Android (same failure mode
 * that already forced Reveal/SafeReveal/KineticText/LedTicker to
 * bypass IO on mobile). Pre-hydration we render a plain visible
 * div so nothing is ever stranded at opacity:0 if hydration is
 * delayed by the loading screen.
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
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(isMobileLike());
    setMounted(true);
  }, []);

  if (reduce || !mounted) return <div className={className}>{children}</div>;

  if (mobile) {
    // Mount-tween cinematic entrance: opacity + translateY only.
    // Single-property tween that the GPU compositor handles without
    // creating per-element layers, and no IO dependency that can
    // strand the child invisible. The entranceReady gate still
    // delays it until the loading screen finishes so the orchestrated
    // page-in sequence is preserved.
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 64 }}
        animate={entranceReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 64 }}
        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
        suppressHydrationWarning
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: drift, scale: minScale }}
      {...(entranceReady
        ? {
            whileInView: { opacity: 1, y: 0, scale: 1 },
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
