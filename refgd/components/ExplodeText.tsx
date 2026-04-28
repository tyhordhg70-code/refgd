"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";

type Props = {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";
  className?: string;
  style?: React.CSSProperties;
  /** Pixel radius the characters scatter from on entrance. */
  scatter?: number;
  /** Tint hue for the trail glow. */
  hue?: string;
};

type Glyph = {
  ch: string;
  x: number;
  y: number;
  rot: number;
  delay: number;
};

/**
 * One-shot reverse-explosion headline.
 *
 *  – Characters fly in from a deterministic 3D scatter and assemble
 *    once (whileInView) — completes regardless of scroll velocity.
 *  – Words are kept atomic (whiteSpace: nowrap) so the title never
 *    breaks mid-word ("STARTEARNING" splitting to "STARTEAR/NING").
 *  – Renders one motion span per glyph.
 */
export default function ExplodeText({
  text,
  as = "h2",
  className = "",
  style,
  scatter = 240,
  hue = "167,139,250",
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const Tag = motion[as] as typeof motion.h2;

  // Build glyph data deterministically (SSR-safe).
  const glyphs = useMemo<Glyph[]>(() => {
    return text.split("").map((ch, i) => {
      const s = (i + 1) * 9301 + 49297;
      const r1 = (s % 233280) / 233280;
      const r2 = ((s * 7) % 233280) / 233280;
      const r3 = ((s * 13) % 233280) / 233280;
      const r4 = ((s * 19) % 233280) / 233280;
      const angle = r1 * Math.PI * 2;
      const dist = scatter * (0.4 + r2 * 0.6);
      return {
        ch,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        rot: (r4 - 0.5) * 90,
        delay: r3 * 0.18,
      };
    });
  }, [text, scatter]);

  // Group glyphs into word-runs separated by spaces. Each run renders
  // inside a `whiteSpace: nowrap` wrapper so the line break only ever
  // happens at the spaces between runs, never mid-word.
  const groups = useMemo(() => {
    const out: Array<{ kind: "word" | "space"; glyphs: Glyph[] }> = [];
    let buf: Glyph[] = [];
    glyphs.forEach((g) => {
      if (g.ch === " ") {
        if (buf.length) out.push({ kind: "word", glyphs: buf });
        out.push({ kind: "space", glyphs: [g] });
        buf = [];
      } else {
        buf.push(g);
      }
    });
    if (buf.length) out.push({ kind: "word", glyphs: buf });
    return out;
  }, [glyphs]);

  let glyphIdx = -1;

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        ...style,
        display: "inline-block",
        textShadow: style?.textShadow ?? `0 0 30px rgba(${hue},0.45), 0 4px 40px rgba(0,0,0,0.95)`,
      }}
      suppressHydrationWarning
      data-testid="explode-text"
    >
      {groups.map((group, gi) => {
        if (group.kind === "space") {
          // Word gap. The editorial-display class applies a heavy
          // negative letter-spacing (-0.045em) which collapses normal
          // spaces between adjacent inline-blocks down to ~9px,
          // making "Stop watching" visually render as "Stopwatching".
          // We render an inline-block spacer with letter-spacing
          // reset AND a real space character inside so textContent /
          // screen-readers / copy-paste preserve the gap as well.
          return (
            <span
              key={`s-${gi}`}
              style={{
                display: "inline-block",
                width: "0.32em",
                letterSpacing: "0",
              }}
            >
              {" "}
            </span>
          );
        }
        return (
          <span
            key={`w-${gi}`}
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
            }}
          >
            {group.glyphs.map((g) => {
              glyphIdx += 1;
              return (
                <motion.span
                  key={glyphIdx}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          x: g.x,
                          y: g.y,
                          rotate: g.rot,
                          filter: "blur(8px)",
                        }
                  }
                  whileInView={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    rotate: 0,
                    filter: "blur(0px)",
                  }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.85,
                    delay: g.delay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    display: "inline-block",
                    willChange: "transform, opacity, filter",
                  }}
                  suppressHydrationWarning
                >
                  {g.ch}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}
