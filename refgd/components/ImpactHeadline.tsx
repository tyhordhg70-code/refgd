"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type CSSProperties } from "react";

type Props = {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  style?: CSSProperties;
  /** Italicise the text (used by the BS pull-quote). */
  italic?: boolean;
};

/**
 * High-impact, fully legible headline.
 *
 * Replaces ExplodeText for two cases where readability + legibility
 * matter more than per-glyph scatter — the BS pull-quote and the
 * final "Stop watching. Start earning." CTA.
 *
 *  – Renders the text as a single flowing block (no per-glyph
 *    inline-block trick) so italic ascenders / descenders never
 *    visually clip and "missing letters" cannot occur.
 *  – Heavy black weight + WebKit text-stroke outline + double drop
 *    shadow keeps it readable on any backdrop.
 *  – Entrance: opacity + Y + blur, replays on every scroll-in
 *    (viewport once: false).
 */
export default function ImpactHeadline({
  text,
  as = "h2",
  className = "",
  style,
  italic = false,
}: Props) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.h2;

  // v6.7 — heavier styling per request ("Stop paying for BS" should
  // read as a hammer-drop quote). 950 weight, thicker text-stroke,
  // brighter violet glow + double drop-shadow so the line is
  // instantly the loudest element on the page.
  const baseStyle: CSSProperties = {
    fontWeight: 950,
    WebkitTextStroke: "1.6px rgba(0,0,0,0.7)",
    textShadow:
      "0 6px 32px rgba(0,0,0,0.98), 0 2px 8px rgba(0,0,0,0.98), 0 0 56px rgba(167,139,250,0.55)",
    fontStyle: italic ? "italic" : undefined,
    ...style,
  };

  return (
    <Tag
      className={className}
      style={baseStyle}
      initial={
        reduce
          ? { opacity: 1 }
          : { opacity: 0, y: 28, filter: "blur(10px)" }
      }
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      suppressHydrationWarning
      data-testid="impact-headline"
    >
      {text}
    </Tag>
  );
}
