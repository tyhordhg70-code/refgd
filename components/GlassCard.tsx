"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * Glassmorphism panel — frosted blur, low-opacity gradient surface, soft
 * 1px border, ambient inner glow. Optional whileInView reveal.
 */
export default function GlassCard({
  children,
  className = "",
  tint = "neutral",
  reveal = true,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  tint?: "neutral" | "amber" | "violet" | "cyan" | "fuchsia" | "rose" | "emerald";
  reveal?: boolean;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const tintGrad = {
    neutral: "from-white/[0.06] via-white/[0.02] to-white/[0.04]",
    amber:   "from-amber-400/[0.10] via-white/[0.03] to-white/[0.04]",
    violet:  "from-violet-500/[0.10] via-white/[0.03] to-white/[0.04]",
    cyan:    "from-cyan-500/[0.10] via-white/[0.03] to-white/[0.04]",
    fuchsia: "from-fuchsia-500/[0.10] via-white/[0.03] to-white/[0.04]",
    rose:    "from-rose-500/[0.10] via-white/[0.03] to-white/[0.04]",
    emerald: "from-emerald-500/[0.10] via-white/[0.03] to-white/[0.04]",
  }[tint];
  const glow = {
    neutral: "shadow-[0_30px_80px_-30px_rgba(255,255,255,0.08)]",
    amber:   "shadow-[0_30px_80px_-30px_rgba(245,185,69,0.4)]",
    violet:  "shadow-[0_30px_80px_-30px_rgba(167,139,250,0.4)]",
    cyan:    "shadow-[0_30px_80px_-30px_rgba(34,211,238,0.4)]",
    fuchsia: "shadow-[0_30px_80px_-30px_rgba(244,114,182,0.4)]",
    rose:    "shadow-[0_30px_80px_-30px_rgba(244,63,94,0.4)]",
    emerald: "shadow-[0_30px_80px_-30px_rgba(52,211,153,0.4)]",
  }[tint];

  const inner = (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br ${tintGrad} ${glow} backdrop-blur-2xl ${className}`}
    >
      {/* inner highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
      {children}
    </div>
  );

  if (!reveal || reduced) return inner;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      whileHover={{
        y: -8,
        rotateX: 5,
        scale: 1.02,
      }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
        hover: { duration: 0.3 },
      }}
      suppressHydrationWarning
      style={{
        perspective: "1200px",
        transformStyle: "preserve-3d",
      }}
    >
      {inner}
    </motion.div>
  );
}
