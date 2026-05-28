"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";
import { isMobileLike } from "@/lib/iosCheck";

/**
 * VanishWrapper — one-shot scroll-into-view ENTRANCE.
 *
 * v21 — on mobile, run an OPACITY-only fade (no y, no scale). The
 * v20 full-bypass eliminated the flicker but the user wanted the
 * animation back. The original flicker came from transform+scale
 * compositor stress on Chrome Android when stacked with the
 * staggered BounceList Row transforms and backdrop-blur recomposite.
 * Opacity-only is cheap, composites cleanly, and still gives the
 * "section appears" beat. Desktop keeps the full fade+rise+scale.
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
    ? { opacity: 0 }
    : { opacity: 0, y: drift, scale: minScale };
  const target = mobile
    ? { opacity: 1 }
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
      transition={{ duration: mobile ? 0.55 : 0.85, ease: [0.22, 1, 0.36, 1] }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}
