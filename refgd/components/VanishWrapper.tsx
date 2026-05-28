"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";
import { isMobileLike } from "@/lib/iosCheck";

/**
 * VanishWrapper — one-shot scroll-into-view ENTRANCE only.
 *
 * v20 — bypass framer-motion entirely on mobile-like devices
 * (Chrome Android, etc.). The fade+scale+y entrance was producing
 * the "glass cards animation flickers and vanishes mid appearance
 * and reappears" report on Refund + SE mentorship sections — the
 * mobile compositor was dropping frames during the simultaneous
 * VanishWrapper transform AND staggered BounceList Row transforms
 * AND backdrop-blur recomposite, surfacing as visible re-paints.
 * Matches the v12 pattern already applied to Reveal / SafeReveal /
 * KineticText / LedTicker (see lib/iosCheck.ts).
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
  // v20 — SSR + mobile: stays at `enableMotion=false` so the wrapper
  // renders as a plain visible <div>. useEffect upgrades to motion
  // ONLY on desktop after mount. drift / minScale kept in API for
  // backwards-compat with existing callers (`drift={50} minScale={0.92}`).
  const [enableMotion, setEnableMotion] = useState(false);
  useEffect(() => {
    if (!isMobileLike()) setEnableMotion(true);
  }, []);

  if (reduce || !enableMotion) {
    return <div className={className} data-vanish-bypass={enableMotion ? undefined : "mobile"}>{children}</div>;
  }

  // ignore-unused: kept so the surface area matches the previous prop
  void drift; void minScale;
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
      style={{ willChange: "opacity, transform" }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}
