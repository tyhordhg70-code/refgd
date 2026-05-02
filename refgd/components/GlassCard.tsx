"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * GlassCard — Lusion.co-style glassmorphism panel.
 *
 * v4 (2026-05): Three-layer transform stack so no transform
 * conflicts occur between the entrance animation, the continuous
 * float, and the 3D hover tilt:
 *
 *   Layer 1: <motion.div>   → Lusion entrance (opacity, y, scale)
 *   Layer 2: <div float>    → CSS float animation (translate Y only)
 *   Layer 3: <div surface>  → liquid-glass-3d hover tilt (rotateX/Y)
 *
 * float-card / float-card-2 / float-card-3 are now extracted from
 * `className` and applied to Layer 2 so they never fight Layer 3's
 * perspective-rotateX/Y transform.
 */

const LUSION_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Card reveal variants — pick a different one per card to avoid the
 * "every card does the same thing" repetition. Each variant is a
 * lusion-style entrance (curtain mask, axial slide, iris, tilt, wipe).
 */
type RevealVariant =
  | "curtain"      // bottom-up curtain mask + tilt-back  (default)
  | "slide-left"   // slide in from the left edge
  | "slide-right"  // slide in from the right edge
  | "iris"         // circular clip-path expand from centre
  | "tilt-3d"     // 3D Y-axis flip-in
  | "wipe-diag";  // diagonal clip-path wipe

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
  /** Explicit reveal variant — wins over `index` rotation. */
  variant?: RevealVariant;
  /** Card index — when no variant given, picks one from a pool so
   *  sibling cards in a row each animate differently. */
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

  if (!reveal || reduced) {
    // No entrance — still wrap in float layer if needed
    return floatClasses ? <div className={floatClasses}>{surface}</div> : surface;
  }

  // Layer 1 (entrance) → Layer 2 (float) → Layer 3 (surface / hover tilt)
  // ─────────────────────────────────────────────────────────────────
  // LUSION-VARIED ENTRANCES:
  //   The user complained that "every card does the same thing".
  //   We now pick a different lusion-style entrance per card so a
  //   row of sibling cards animates as a varied composition rather
  //   than one synchronised motion. Pool of variants below; cards
  //   either pass `variant` directly or rely on `index` to pick.
  //
  //   `once: true` — once a card has revealed, it STAYS revealed
  //   even when scrolled past and back. Earlier `once: false`
  //   meant cards re-clipped themselves to invisible whenever they
  //   left the viewport, which made the page read as "blank" zones
  //   when the user scrolled back up.
  const VARIANTS: RevealVariant[] = [
    "curtain",
    "slide-left",
    "wipe-diag",
    "tilt-3d",
    "slide-right",
    "iris",
  ];
  const v: RevealVariant =
    variant ?? VARIANTS[((index ?? 0) % VARIANTS.length + VARIANTS.length) % VARIANTS.length];

  const initials: Record<RevealVariant, any> = {
    curtain:    { opacity: 0, y: 140, rotateX: 8, clipPath: "inset(100% 0% 0% 0%)" },
    "slide-left":  { opacity: 0, x: -120, clipPath: "inset(0% 0% 0% 100%)" },
    "slide-right": { opacity: 0, x:  120, clipPath: "inset(0% 100% 0% 0%)" },
    iris:       { opacity: 0, scale: 0.86, clipPath: "circle(0% at 50% 50%)" },
    "tilt-3d":  { opacity: 0, rotateY: -42, x: -40 },
    "wipe-diag": { opacity: 0, clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" },
  };
  const targets: Record<RevealVariant, any> = {
    curtain:    { opacity: 1, y: 0, rotateX: 0, clipPath: "inset(0% 0% 0% 0%)" },
    "slide-left":  { opacity: 1, x: 0, clipPath: "inset(0% 0% 0% 0%)" },
    "slide-right": { opacity: 1, x: 0, clipPath: "inset(0% 0% 0% 0%)" },
    iris:       { opacity: 1, scale: 1, clipPath: "circle(75% at 50% 50%)" },
    "tilt-3d":  { opacity: 1, rotateY: 0, x: 0 },
    "wipe-diag": { opacity: 1, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
  };
  const durations: Record<RevealVariant, number> = {
    curtain: 1.55, "slide-left": 1.2, "slide-right": 1.2, iris: 1.35, "tilt-3d": 1.3, "wipe-diag": 1.1,
  };

  return (
    <motion.div
      initial={initials[v]}
      whileInView={targets[v]}
      viewport={{ once: true, amount: 0.05 }}
      transition={{
        duration: durations[v],
        delay,
        ease: LUSION_EASE,
      }}
      suppressHydrationWarning
      className="group will-change-transform"
      style={{
        transformPerspective: 1500,
        transformOrigin: v === "tilt-3d" ? "0% 50%" : "50% 100%",
      }}
    >
      {floatClasses ? (
        <div className={floatClasses}>{surface}</div>
      ) : surface}
    </motion.div>
  );
}
