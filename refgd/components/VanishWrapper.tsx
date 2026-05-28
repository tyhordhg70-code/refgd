"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";
import { isMobileLike } from "@/lib/iosCheck";

/**
 * VanishWrapper — cinematic scroll-into-view entrance.
 *
 * v22 — mobile fly-in: opacity + translateY(64) only, eased over
 * 0.95s with cubic-bezier(0.16,1,0.3,1) for a soft, dramatic landing.
 * Single-tween transforms (no keyframe arrays) avoid the v18 flicker
 * while still giving the wrapped block real cinematic motion.
 * Desktop keeps the y + scale entrance.
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
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setMobile(isMobileLike()); }, []);

  if (reduce) return <div className={className}>{children}</div>;

  const initial = mobile
    ? { opacity: 0, y: 64 }
    : { opacity: 0, y: drift, scale: minScale };
  const target = mobile
    ? { opacity: 1, y: 0 }
    : { opacity: 1, y: 0, scale: 1 };

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
      transition={{
        duration: mobile ? 0.95 : 0.85,
        ease: mobile ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1],
      }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}
