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
  elastic?: boolean;
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
  // LUSION-AUTHENTIC ENTRANCE (round 6 — reliability fix):
  //   Lusion.co's signature card reveal is a curtain-rise mask + slide,
  //   long exponential ease-out, faint rotateX tilt that flattens as
  //   it lands. No scale.
  //
  //   Round 5 used `clipPath: inset(100%)` as the initial state and
  //   `viewport.once: false` so cards re-hid every time they left the
  //   viewport. That combination caused entire sections of the page
  //   (Trust cards, Pricing cards, How-it-works steps, Why-choose-us,
  //   Evade-like-a-Pro intro, Comprehensive Solutions, Features 2x2)
  //   to render as blank space whenever the framer-motion
  //   IntersectionObserver lost track of them — which happened
  //   reliably on slow first paints, hydration races with the
  //   LoadingScreen, or after scrolling past + back. The card was
  //   sitting there in the DOM at clip-path: inset(100%) — completely
  //   invisible, with no entrance animation ever firing. Users saw a
  //   section header followed by empty space.
  //
  //   Round 6 fixes the reliability without losing the look:
  //
  //     • `once: true` — the reveal fires once when the card first
  //       enters the viewport and the card stays visible afterwards.
  //       The "vanish/reappear" rhythm was a misinterpretation of
  //       Lusion (their cards do not re-hide on scroll-past).
  //     • `amount: 0.05` — fire as soon as ~5% is visible (was 12%),
  //       so a card whose layout box is just barely on screen still
  //       triggers; this guards against the y:140 displacement
  //       pushing the card's effective bbox out of view at mount.
  //     • Initial `y: 80` instead of 140 — keeps the slide visible
  //       but reduces the "card mounted off-screen, observer missed
  //       it" failure mode.
  //
  //   Transition: 1.55s with [0.16, 1, 0.3, 1] (power4.out).
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 80,
        rotateX: 8,
        clipPath: "inset(100% 0% 0% 0%)",
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        rotateX: 0,
        clipPath: "inset(0% 0% 0% 0%)",
      }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{
        duration: 1.55,
        delay,
        ease: LUSION_EASE,
      }}
      suppressHydrationWarning
      className="group will-change-transform"
      style={{
        transformPerspective: 1500,
        transformOrigin: "50% 100%",
      }}
    >
      {floatClasses ? (
        <div className={floatClasses}>{surface}</div>
      ) : surface}
    </motion.div>
  );
}
