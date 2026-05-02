"use client";
import { useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * GlassCard — Lusion.co-style glassmorphism panel.
 *
 * v5 (2026-05): CSS-only reveal.
 *
 * Earlier versions used `framer-motion` `whileInView` + IntersectionObserver
 * to play a curtain-rise / clip-path mask entrance. On this site that
 * approach was unreliable — the observer occasionally never fired (parent
 * containing blocks created by ParallaxChapter's `transform`,
 * `content-visibility: auto` on mobile sections, the LoadingScreen overlay
 * delaying first paint, etc.) leaving cards stuck at their initial state
 * (`opacity: 0`, `clip-path: inset(100%)`) — i.e. INVISIBLE FOREVER.
 *
 * Symptom users saw: section headers ("WHY TRUST US?", "Get started today.",
 * "How it works", "Why choose us?", "Evade like a PRO", "Our comprehensive
 * solutions") rendered fine but the cards underneath were just dark space.
 *
 * Fix: drop framer-motion's whileInView entirely and use a CSS keyframe
 * animation (`.glass-card-reveal` in globals.css) that ALWAYS plays on
 * mount. CSS animations are guaranteed by the browser — they don't need
 * an IntersectionObserver, they don't care about parent transforms, and
 * they survive hydration races. The lusion curtain-rise look is preserved
 * (translateY + clip-path inset), just driven by CSS instead of JS.
 *
 * `delay` still works (`animationDelay` inline style) for staggered card
 * reveals. `reveal={false}` still skips the animation. Reduced-motion
 * users are respected via @media query in the CSS.
 *
 * Three-layer transform stack so the entrance, the continuous float
 * (float-card / float-card-2 / float-card-3) and the 3D hover tilt
 * (liquid-glass-3d) never fight each other:
 *
 *   Layer 1: <div .glass-card-reveal>   → CSS curtain entrance
 *   Layer 2: <div float-card>           → CSS float (translateY only)
 *   Layer 3: <div .liquid-glass-3d>     → hover tilt (rotateX/Y)
 */

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

  const innerLayer = floatClasses ? <div className={floatClasses}>{surface}</div> : surface;

  // No reveal requested OR reduced-motion preferred → render plain.
  if (!reveal || reduced) {
    return <div className="group">{innerLayer}</div>;
  }

  // Reveal layer — CSS-only curtain rise. Always plays on mount.
  return (
    <div
      className="group glass-card-reveal will-change-transform"
      style={{ animationDelay: `${delay}s` }}
    >
      {innerLayer}
    </div>
  );
}
