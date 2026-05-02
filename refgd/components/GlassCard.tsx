"use client";
import { useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * GlassCard — Lusion.co-style glassmorphism panel.
 *
 * v6 (2026-05): CSS-driven varied entrances.
 *
 *  • 6 lusion-style entrance variants (curtain, slide-left, slide-right,
 *    iris, tilt-3d, wipe-diag). Each is a CSS @keyframes in globals.css
 *    so it ALWAYS plays on mount — no framer-motion / IntersectionObserver
 *    races (which had been leaving cards permanently stuck at
 *    `clip-path: inset(100%)` — invisible — on this site).
 *
 *  • Pass `variant` to force a specific entrance, OR `index` to rotate
 *    through the variant pool so a row of sibling cards each animates
 *    differently (no synchronised "every card does the same thing"
 *    feel that the user complained about).
 *
 *  • `delay` becomes the inline `animation-delay` so staggered card
 *    cascades (`delay={i * 0.1}`) still work exactly the same.
 *
 *  • CSS `animation-fill-mode: backwards` keeps the card invisible
 *    during the delay window and removes the transform after the
 *    animation ends — so the float-card layer's continuous translateY
 *    and the liquid-glass-3d hover tilt take over cleanly with no
 *    leftover transform conflict.
 *
 * Three-layer transform stack:
 *   Layer 1: <div .glass-card-reveal--{variant}>  → CSS entrance
 *   Layer 2: <div float-card>                     → CSS continuous float
 *   Layer 3: <div .liquid-glass-3d>               → hover tilt
 */

const VARIANTS = ["curtain", "slide-left", "wipe-diag", "tilt-3d", "slide-right", "iris"] as const;
type RevealVariant = typeof VARIANTS[number];

export default function GlassCard({
  children,
  className = "",
  tint = "neutral",
  reveal = true,
  delay = 0,
  elastic = true,
  variant,
  index,
}: {
  children: ReactNode;
  className?: string;
  tint?: "neutral" | "amber" | "violet" | "cyan" | "fuchsia" | "rose" | "emerald";
  reveal?: boolean;
  delay?: number;
  elastic?: boolean;
  /** Force a specific entrance variant. Wins over `index`. */
  variant?: RevealVariant;
  /** Card index in its row — picks a variant from the pool so
   *  sibling cards don't animate identically. */
  index?: number;
}) {
  const reduced = useReducedMotion();

  // Split float-card classes off so they live on a separate div from
  // the glass surface (which needs its own uncontested transform).
  const floatRe = /\bfloat-card(?:-[23])?\b/g;
  const floatClasses = (className.match(floatRe) || []).join(" ");
  const surfaceClasses = className.replace(floatRe, "").trim();

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

  const elasticClass = elastic && !reduced ? "liquid-glass-3d liquid-glass-mobile" : "";

  // Layer 3 — glass surface (hover tilt lives here)
  const surface = (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/[0.18] bg-gradient-to-br ${tintGrad} ${glow} backdrop-blur-2xl ${elasticClass} ${surfaceClasses}`}
      style={{ backgroundColor: "rgba(8,6,18,0.62)" }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)" }}
      />
      {children}
    </div>
  );

  const innerLayer = floatClasses ? <div className={floatClasses}>{surface}</div> : surface;

  if (!reveal || reduced) {
    return <div className="group">{innerLayer}</div>;
  }

  // Pick variant — explicit `variant` prop wins, otherwise rotate
  // through the pool by `index` so sibling cards differ.
  const v: RevealVariant =
    variant ?? VARIANTS[(((index ?? 0) % VARIANTS.length) + VARIANTS.length) % VARIANTS.length];

  return (
    <div
      className={`group glass-card-reveal glass-card-reveal--${v} will-change-transform`}
      style={{ animationDelay: `${delay}s` }}
    >
      {innerLayer}
    </div>
  );
}
