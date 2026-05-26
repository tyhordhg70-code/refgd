"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, type CSSProperties } from "react";

export type RevealKind =
  | "lift"
  | "slideLeft"
  | "slideRight"
  | "fan"
  | "fanLeft"
  | "fanRight"
  | "scale"
  | "wipe";

/**
 * SafeReveal v3 — bulletproof scroll-in. Hardened rules:
 *
 *   1. Opacity ALWAYS 1, in both initial and rest state, in SSR HTML.
 *      Content can never be invisible if framer-motion fails to hydrate
 *      or IntersectionObserver fails to fire (e.g., Lenis smooth-scroll
 *      interfering with viewport detection).
 *
 *   2. NO horizontal translate, NO rotate, NO scale. Initial state is
 *      a pure vertical translate (y:38 to y:60 depending on emphasis).
 *      This eliminates "cards cut off before animation begins" — a
 *      card translated horizontally past its grid column overflows the
 *      viewport edge until animation fires.
 *
 *   3. once:true so the animation never re-triggers on scroll-back.
 *      Even if Lenis breaks the IntersectionObserver mid-scroll, an
 *      already-shown element stays at rest (y:0).
 *
 *   4. amount:0.01 + margin:"0px 0px 5% 0px" — fires the moment ANY
 *      pixel of the element enters viewport. Lenis-resistant.
 *
 * The `kind` prop is preserved for backward compat with existing
 * callsites, but all kinds collapse to a vertical lift with subtle
 * variation in y-offset and duration. This is intentional: rich
 * variety is achieved through delay staggering across siblings, not
 * through transforms that risk visual clipping.
 */
export default function SafeReveal({
  children,
  className = "",
  style,
  delay = 0,
  kind = "lift",
  amount = 0.01,
  duration = 0.95,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  kind?: RevealKind;
  amount?: number;
  duration?: number;
  as?: "div" | "section" | "article" | "li";
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    const Static = Tag as any;
    return (
      <Static className={className} style={style}>
        {children}
      </Static>
    );
  }

  const yByKind: Record<RevealKind, number> = {
    lift: 38,
    slideLeft: 32,
    slideRight: 32,
    fan: 52,
    fanLeft: 52,
    fanRight: 52,
    scale: 28,
    wipe: 44,
  };

  const M = (motion as any)[Tag];
  return (
    <M
      className={className}
      style={style}
      initial={{ opacity: 1, y: yByKind[kind] }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount, margin: "0px 0px 5% 0px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      suppressHydrationWarning
    >
      {children}
    </M>
  );
}
