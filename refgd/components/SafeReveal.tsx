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
 * SafeReveal v2 — rich scroll-in animations that NEVER bake opacity:0
 * into SSR HTML. Opacity is always 1, so even if framer-motion never
 * hydrates the content remains readable. Reveal effect comes from
 * transform (translate / rotate / scale) and optional clip-path —
 * all visible at rest.
 *
 * Uses `once: true` so animations fire exactly once when scrolled
 * into view and never re-trigger on scroll-back. This eliminates the
 * "card vanishes / cuts in half" mid-animation flash that prior
 * `once: false` configurations caused on Lenis-driven scroll.
 */
export default function SafeReveal({
  children,
  className = "",
  style,
  delay = 0,
  kind = "lift",
  amount = 0.15,
  duration = 0.9,
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

  const initialByKind: Record<RevealKind, Record<string, unknown>> = {
    lift:       { opacity: 1, y: 36 },
    slideLeft:  { opacity: 1, x: -56, y: 16 },
    slideRight: { opacity: 1, x:  56, y: 16 },
    fan:        { opacity: 1, y: 60, rotate: -3, scale: 0.93 },
    fanLeft:    { opacity: 1, x: -50, y: 40, rotate: -4, scale: 0.92 },
    fanRight:   { opacity: 1, x:  50, y: 40, rotate:  4, scale: 0.92 },
    scale:      { opacity: 1, scale: 0.85, y: 20 },
    wipe:       { opacity: 1, clipPath: "inset(0 100% 0 0)" },
  };
  const restByKind: Record<RevealKind, Record<string, unknown>> = {
    lift:       { opacity: 1, y: 0 },
    slideLeft:  { opacity: 1, x: 0, y: 0 },
    slideRight: { opacity: 1, x: 0, y: 0 },
    fan:        { opacity: 1, y: 0, rotate: 0, scale: 1 },
    fanLeft:    { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 },
    fanRight:   { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 },
    scale:      { opacity: 1, scale: 1, y: 0 },
    wipe:       { opacity: 1, clipPath: "inset(0 0% 0 0)" },
  };

  const M = (motion as any)[Tag];
  return (
    <M
      className={className}
      style={style}
      initial={initialByKind[kind]}
      whileInView={restByKind[kind]}
      viewport={{ once: true, amount, margin: "0px 0px -8% 0px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      suppressHydrationWarning
    >
      {children}
    </M>
  );
}
