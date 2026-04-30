"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * Glassmorphism panel — frosted blur, low-opacity gradient surface, soft
 * 1px border, ambient inner glow.
 *
 * v3 (2026-04-30): Lusion.co-style reveal.
 *
 *   The previous v2 used a complex multi-keyframe array entrance with
 *   `borderRadius` string interpolation, `skewX`, `rotateX/Y`, `scale`
 *   and `y` all animating as 3-step arrays. Two failure modes hit at
 *   the same time:
 *
 *     1. `viewport={{ margin: "-60px" }}` insets the trigger by 60px
 *        which can be stepped over on fast scrolls, leaving cards
 *        permanently at `opacity:0` (invisible / "disappeared").
 *     2. The `borderRadius` array interpolation with asymmetric
 *        corner values + nested `transformStyle: preserve-3d` could
 *        produce intermediate frames where the card flashes invalid
 *        clipped geometry ("glitched").
 *
 *   The new reveal is a clean, robust Lusion-style:
 *     opacity 0 → 1, y 100px → 0, scale 0.92 → 1
 *     duration 1.2s, lusion cubic ease (0.16, 1, 0.3, 1)
 *     trigger via `amount: 0.15` (15% visible — fires reliably).
 *
 *   The elastic mesh deformation lives on hover only via the
 *   `liquid-glass-3d` / `liquid-glass-mobile` CSS classes. No entrance
 *   keyframes that can corrupt mid-flight.
 */

const LUSION_EASE = [0.16, 1, 0.3, 1] as const;

export default function GlassCard({
  children,
  className = "",
  tint = "neutral",
  reveal = true,
  delay = 0,
  elastic = true,
}: {
  children: ReactNode;
  className?: string;
  tint?: "neutral" | "amber" | "violet" | "cyan" | "fuchsia" | "rose" | "emerald";
  reveal?: boolean;
  delay?: number;
  /** When true, applies the elastic deformation hover (CSS-only). */
  elastic?: boolean;
}) {
  const reduced = useReducedMotion();
  const tintGrad = {
    neutral: "from-white/[0.10] via-white/[0.04] to-white/[0.06]",
    amber:   "from-amber-400/[0.28] via-amber-300/[0.06] to-white/[0.04]",
    violet:  "from-violet-500/[0.28] via-violet-400/[0.06] to-white/[0.04]",
    cyan:    "from-cyan-500/[0.28] via-cyan-400/[0.06] to-white/[0.04]",
    fuchsia: "from-fuchsia-500/[0.28] via-fuchsia-400/[0.06] to-white/[0.04]",
    rose:    "from-rose-500/[0.28] via-rose-400/[0.06] to-white/[0.04]",
    emerald: "from-emerald-500/[0.28] via-emerald-400/[0.06] to-white/[0.04]",
  }[tint];
  const glow = {
    neutral: "shadow-[0_30px_80px_-30px_rgba(255,255,255,0.18)]",
    amber:   "shadow-[0_30px_80px_-30px_rgba(245,185,69,0.55)]",
    violet:  "shadow-[0_30px_80px_-30px_rgba(167,139,250,0.55)]",
    cyan:    "shadow-[0_30px_80px_-30px_rgba(34,211,238,0.55)]",
    fuchsia: "shadow-[0_30px_80px_-30px_rgba(244,114,182,0.55)]",
    rose:    "shadow-[0_30px_80px_-30px_rgba(244,63,94,0.55)]",
    emerald: "shadow-[0_30px_80px_-30px_rgba(52,211,153,0.55)]",
  }[tint];

  // Hover-only liquid deformation — kept as CSS classes so it doesn't
  // run as an entrance keyframe (which previously caused the glitch).
  const elasticClass = elastic && !reduced ? "liquid-glass-3d liquid-glass-mobile" : "";

  const inner = (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/[0.18] bg-gradient-to-br ${tintGrad} ${glow} backdrop-blur-2xl ${elasticClass} ${className}`}
      style={{
        backgroundColor: "rgba(8,6,18,0.62)",
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
        }}
      />
      {children}
    </div>
  );

  if (!reveal || reduced) return inner;

  // Lusion-style reveal — single keyframe, no arrays, no borderRadius
  // interpolation. `amount: 0.15` triggers when 15% of the card is
  // visible (vs the brittle `margin: "-60px"` inset that could be
  // skipped on fast scroll).
  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1.2, delay, ease: LUSION_EASE }}
      suppressHydrationWarning
      className="group will-change-transform"
    >
      {inner}
    </motion.div>
  );
}
