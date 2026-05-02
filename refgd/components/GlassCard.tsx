"use client";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";

/**
 * GlassCard — Lusion.co-style glassmorphism panel.
 *
 * v6.1 (2026-05): CSS-driven varied entrances + IO-triggered playback.
 *
 *  • 6 lusion-style entrance variants (curtain, slide-left, slide-right,
 *    iris, tilt-3d, wipe-diag). Each is a CSS @keyframes in globals.css
 *    so once the variant class is on the element, the animation ALWAYS
 *    plays — no framer-motion clip-path race that had been leaving cards
 *    permanently invisible on this site.
 *
 *  • The variant class is added by an IntersectionObserver, so cards
 *    DO NOT animate during the LoadingScreen (which blocks scroll for
 *    1.5s+ minimum). Off-screen cards stay invisible (.gc-pending) until
 *    they scroll within 10% of the viewport bottom, at which point the
 *    keyframe runs once. This is what the user means by "lusion-style
 *    varied animations" — different per card AND scroll-triggered, not
 *    burned through during the boot overlay.
 *
 *  • Pass `variant` to force a specific entrance, OR `index` to rotate
 *    through the variant pool so a row of sibling cards each animates
 *    differently.
 *
 *  • `delay` becomes the inline `animation-delay` so staggered card
 *    cascades (`delay={i * 0.1}`) still work exactly the same.
 *
 * Three-layer transform stack:
 *   Layer 1: <div .glass-card-reveal--{variant}>  → CSS entrance (IO-gated)
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
  // v6.2 (2026-05): dropped tinted halo alpha 0.55 → 0.18 across every
  // colour. The 0.55 colored shadow was reading as a HARD GLOW EDGE
  // around every box card on storelist / evade-cancelations / exclusive-
  // mentorships (every GlassCard with `tint=` had a visible coloured
  // ring). 0.18 keeps the colour cue while letting the card breathe.
  const glow = {
    neutral: "shadow-[0_30px_80px_-30px_rgba(255,255,255,0.10)]",
    amber:   "shadow-[0_30px_80px_-30px_rgba(245,185,69,0.18)]",
    violet:  "shadow-[0_30px_80px_-30px_rgba(167,139,250,0.18)]",
    cyan:    "shadow-[0_30px_80px_-30px_rgba(34,211,238,0.18)]",
    fuchsia: "shadow-[0_30px_80px_-30px_rgba(244,114,182,0.18)]",
    rose:    "shadow-[0_30px_80px_-30px_rgba(244,63,94,0.18)]",
    emerald: "shadow-[0_30px_80px_-30px_rgba(52,211,153,0.18)]",
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

  // IntersectionObserver-gated playback. The card stays in `.gc-pending`
  // state (opacity 0, hidden) until it actually scrolls into view, so
  // off-screen cards do NOT burn their entrance animation while the
  // LoadingScreen overlay is up. Once the IO fires we add the variant
  // class — the keyframe runs and the card lands in its final state.
  //
  // `entranceReady` defers BOTH the immediate-reveal shortcut (for
  // above-the-fold cards) and the IO setup itself until the loading
  // splash has lifted. Without this gate, cards above the fold would
  // call setRevealed(true) on first mount — silently playing their
  // entrance keyframe behind the splash overlay so the user sees the
  // already-finished card when the splash fades.
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const entranceReady = useEntranceReady();
  useEffect(() => {
    if (!entranceReady) return;
    const el = ref.current;
    if (!el) return;
    // If the card is already visible on first paint (above-the-fold
    // hero panels, etc.), reveal immediately.
    const r = el.getBoundingClientRect();
    if (
      r.top < (window.innerHeight || 0) * 0.95 &&
      r.bottom > 0
    ) {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [entranceReady]);

  return (
    <div
      ref={ref}
      className={
        revealed
          ? `group glass-card-reveal glass-card-reveal--${v} will-change-transform`
          : `group gc-pending will-change-transform`
      }
      style={{ animationDelay: `${delay}s` }}
    >
      {innerLayer}
    </div>
  );
}
