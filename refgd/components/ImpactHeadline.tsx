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

  const baseStyle: CSSProperties = {
    fontWeight: 900,
    WebkitTextStroke: "1.2px rgba(0,0,0,0.55)",
    textShadow:
      "0 4px 24px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95), 0 0 40px rgba(167,139,250,0.30)",
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
      viewport={{ once: false, margin: "-60px" }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      suppressHydrationWarning
      data-testid="impact-headline"
    >
      {text}
    </Tag>
  );
}
