"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

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
 *
 * Trigger architecture (Round 6.4):
 *   Previously each glyph was its own `whileInView` motion.span. The
 *   IntersectionObserver under `whileInView` reads the element's
 *   transformed bounding-box, so a glyph initially translated by
 *   `x:300px y:300px` was reported as far below the viewport even
 *   when the headline itself was perfectly in view. Glyphs only
 *   "entered view" once the user scrolled hundreds of px past the
 *   headline, which the user observed as "Stop watching. Start
 *   earning. only triggers when you scroll all the way down".
 *
 *   Now: the parent `<Tag>` carries `whileInView` and switches a
 *   single variant from `hidden` → `show`. The variant cascade
 *   propagates to every child motion.span automatically. The IO is
 *   observing the headline's NORMAL layout box (no transforms), so
 *   the explosion fires the moment the headline crosses the viewport
 *   threshold like every other entrance on the page.
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
  const Tag = motion[as] as typeof motion.h2;

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
      className={className}
      style={{
        ...style,
        display: "block",
        textAlign: (style as any)?.textAlign ?? "center",
        textShadow: style?.textShadow ?? `0 0 30px rgba(${hue},0.45), 0 4px 40px rgba(0,0,0,0.95)`,
      }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.05, margin: "0px 0px -8% 0px" }}
      suppressHydrationWarning
      data-testid="explode-text"
    >
      {groups.map((group, gi) => {
        if (group.kind === "space") {
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
                  variants={
                    reduce
                      ? {
                          hidden: { opacity: 0 },
                          show: {
                            opacity: 1,
                            transition: { duration: 0.35, delay: g.delay },
                          },
                        }
                      : {
                          hidden: {
                            opacity: 0,
                            x: g.x,
                            y: g.y,
                            rotate: g.rot,
                            filter: "blur(8px)",
                          },
                          show: {
                            opacity: 1,
                            x: 0,
                            y: 0,
                            rotate: 0,
                            filter: "blur(0px)",
                            transition: {
                              duration: 0.85,
                              delay: g.delay,
                              ease: [0.22, 1, 0.36, 1],
                            },
                          },
                        }
                  }
                  style={{
                    display: "inline-block",
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
