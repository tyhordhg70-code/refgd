"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

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

  // Mobile-aware scatter: glyphs flying in from 420px on a 360px
  // viewport push the entire row off-screen, breaking the assemble
  // animation. Halve the radius below 640px so the explosion fits
  // inside the headline's actual line-box.
  const [responsiveScatter, setResponsiveScatter] = useState(scatter);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const w = window.innerWidth;
      if (w < 480) setResponsiveScatter(Math.min(scatter, 120));
      else if (w < 768) setResponsiveScatter(Math.min(scatter, 200));
      else setResponsiveScatter(scatter);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [scatter]);

  // Build glyph data deterministically (SSR-safe).
  const glyphs = useMemo<Glyph[]>(() => {
    return text.split("").map((ch, i) => {
      const s = (i + 1) * 9301 + 49297;
      const r1 = (s % 233280) / 233280;
      const r2 = ((s * 7) % 233280) / 233280;
      const r3 = ((s * 13) % 233280) / 233280;
      const r4 = ((s * 19) % 233280) / 233280;
      const angle = r1 * Math.PI * 2;
      const dist = responsiveScatter * (0.4 + r2 * 0.6);
      return {
        ch,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        rot: (r4 - 0.5) * 90,
        delay: r3 * 0.18,
      };
    });
  }, [text, responsiveScatter]);

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

  // Reduced-motion short-circuit: render the headline as a single
  // plain Tag with the text. NO per-glyph motion spans, NO opacity:0
  // initial, NO whileInView trigger that depends on scroll position.
  // Previously the reduce branch still set initial:{ opacity:0 } and
  // relied on whileInView to flip it to 1 — which silently failed
  // when the headline was off-screen during initial render or when
  // automation/full-page screenshots scrolled past it too quickly.
  // The result on the live site was the "Stop watching. Start
  // earning." line appearing partly or completely missing.
  if (reduce) {
    const Plain = as as any;
    return (
      <Plain
        className={className}
        style={{
          ...style,
          display: "block",
          textAlign: (style as any)?.textAlign ?? "center",
          textShadow:
            style?.textShadow ??
            `0 0 30px rgba(${hue},0.45), 0 4px 40px rgba(0,0,0,0.95)`,
        }}
        data-testid="explode-text"
      >
        {text}
      </Plain>
    );
  }

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        ...style,
        // display:block so the headline takes full container width and
        // wraps NATURALLY at the word-group boundaries on narrow
        // viewports. Previously inline-block let the title grow as
        // wide as its content and the right-side glyphs slid under
        // the viewport edge on mobile, cutting "earning." in half.
        display: "block",
        textAlign: (style as any)?.textAlign ?? "center",
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
                    // Italic glyphs (used by the BS pull-quote) have
                    // ascenders / descenders that bleed past their
                    // bounding-box. Combined with editorial-display's
                    // -0.045em letter-spacing, adjacent inline-blocks
                    // can visually clip each other and read as
                    // "missing letters". A small horizontal padding
                    // gives each glyph room to breathe; matching
                    // negative margin keeps total advance width the
                    // same so the headline still reads tight.
                    paddingLeft: "0.05em",
                    paddingRight: "0.05em",
                    marginLeft: "-0.05em",
                    marginRight: "-0.05em",
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
