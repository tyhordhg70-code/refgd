"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/**
 * ScrollRain — page-wide cosmic streak rain that intensifies with scroll.
 *
 * - Generates a fixed deterministic field of vertical "comet streaks"
 *   that fall continuously via CSS.
 * - As the user scrolls down the page, the field opacity ramps up,
 *   the streaks accelerate, and a slight wind shear is applied.
 * - On mobile and reduced-motion users we tone everything down.
 *
 * Mounted under the page content (z-[2]) but above HomeBackground (z-1)
 * so the rain reads in front of the orbs but behind the cards.
 */
export default function ScrollRain({
  density = 36,
  className = "",
}: {
  density?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const stable = reduced || isMobile;
  const count = stable ? Math.max(8, Math.floor(density / 3)) : density;

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.6, 1],
    stable ? [0.18, 0.22, 0.32, 0.22] : [0.0, 0.4, 0.85, 0.55],
  );
  const shear = useTransform(scrollYProgress, [0, 1], stable ? [0, 0] : [0, -8]);

  const streaks = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const r = (n: number) => ((seed * (n + 1)) % 1000) / 1000;
      return {
        left: `${(r(1) * 100).toFixed(2)}%`,
        delay: -r(2) * 6,
        duration: 3 + r(3) * 5,
        height: 30 + r(4) * 90,
        width: 1 + r(5) * 1.5,
        hue: 200 + r(6) * 80,
        opacity: 0.4 + r(7) * 0.6,
      };
    });
  }, [count]);

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[2] overflow-hidden ${className}`}
      style={mounted ? { opacity, skewX: shear } : { opacity: 0 }}
      suppressHydrationWarning
    >
      {streaks.map((s, i) => (
        <span
          key={i}
          className="scroll-rain-streak"
          style={{
            left: s.left,
            width: `${s.width}px`,
            height: `${s.height}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            background: `linear-gradient(to bottom, transparent 0%, hsla(${s.hue.toFixed(0)}, 90%, 80%, ${s.opacity.toFixed(2)}) 60%, hsla(${s.hue.toFixed(0)}, 90%, 95%, ${(s.opacity * 0.9).toFixed(2)}) 100%)`,
            boxShadow: `0 0 6px hsla(${s.hue.toFixed(0)}, 90%, 80%, ${(s.opacity * 0.6).toFixed(2)})`,
          }}
        />
      ))}
    </motion.div>
  );
}
