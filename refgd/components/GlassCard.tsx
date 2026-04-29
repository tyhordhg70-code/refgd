"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * Glassmorphism panel — frosted blur, low-opacity gradient surface, soft
 * 1px border, ambient inner glow. Optional whileInView reveal.
 *
 * v2 (2026-04): bumped surface opacity for readability, added a 3D liquid-
 * glass underbase, and an elastic hover deformation (border-radius +
 * skew + non-uniform scale on a spring-y bezier curve) so the cards
 * feel like they stretch rather than rigidly scale.
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
  /** When true, applies the elastic deformation hover. Default true. */
  elastic?: boolean;
}) {
  const reduced = useReducedMotion();
  // Surface tint — a tinted accent over a near-solid dark base so text is
  // readable against any backdrop (galaxy, illustration, etc).
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

  // Mobile devices never trigger :hover, so the elastic mesh effect
  // would be invisible to most visitors. We add `liquid-glass-mobile`
  // (continuous breathing keyframe) on top of `liquid-glass-3d` so
  // touch users see a visible deformation loop without lifting a finger.
  const elasticClass = elastic && !reduced ? "liquid-glass-3d liquid-glass-mobile" : "";

  const inner = (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/[0.18] bg-gradient-to-br ${tintGrad} ${glow} backdrop-blur-2xl ${elasticClass} ${className}`}
      style={{
        // Dark base under the tint so the card is opaque enough to read.
        backgroundColor: "rgba(8,6,18,0.62)",
      }}
    >
      {/* top inner highlight — gives the gel-cap "liquid glass" gloss */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
      {/* bottom inner shadow — gives depth so card reads as 3D */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent"
      />
      {/* refraction sheen — subtle diagonal pass that tracks on hover */}
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

  // For elastic cards we add a visible "deformed mesh expansion"
  // entrance — border-radius asymmetric wobble + scale + skew — so the
  // 3D liquid-glass deformation is actually seen on touch devices that
  // never trigger the :hover state. Non-elastic cards keep the simple
  // y/opacity reveal.
  if (elastic) {
    return (
      <motion.div
        initial={{
          opacity: 0,
          y: 40,
          scale: 0.82,
          skewX: -10,
          rotateX: 14,
          rotateY: -6,
          borderRadius: "70px 12px 70px 12px",
        }}
        whileInView={{
          opacity: 1,
          y: [40, -14, 0],
          scale: [0.82, 1.06, 1],
          skewX: [-10, 4, 0],
          rotateX: [14, -5, 0],
          rotateY: [-6, 3, 0],
          // border-radius wobble: stretches into asymmetric shapes
          // and snaps back to a near-rounded square — visually reads
          // as the card's mesh deforming and settling. More dramatic
          // (was 60px max → now 80px) so it's obvious on mobile too.
          borderRadius: [
            "70px 12px 70px 12px",
            "16px 60px 18px 58px",
            "30px 26px 28px 32px",
          ],
        }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{
          duration: 1.35,
          delay,
          times: [0, 0.55, 1],
          ease: [0.22, 1.6, 0.36, 1],
        }}
        style={{ perspective: 1100, transformStyle: "preserve-3d" }}
        suppressHydrationWarning
        className="group"
      >
        {inner}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      suppressHydrationWarning
      className="group"
    >
      {inner}
    </motion.div>
  );
}
