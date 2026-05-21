"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import type { CSSProperties, ElementType } from "react";

  /**
   * SplitTextReveal — Lusion/Noomo-style character-by-character text
   * reveal. Each glyph rotates up from the baseline with a staggered
   * delay when the element scrolls into view. One-shot (viewport once).
   *
   * Plain text only — not editable in place. Used for static headings
   * and oversized scene labels inside the Evade redesign. For
   * admin-editable text use EditableText (which falls through to a
   * plain span and would defeat the per-glyph animation anyway).
   */
  export default function SplitTextReveal({
    text,
    className = "",
    style,
    as: Tag = "span",
    delay = 0,
    stagger = 0.025,
  }: {
    text: string;
    className?: string;
    style?: CSSProperties;
    as?: ElementType;
    delay?: number;
    stagger?: number;
  }) {
    const reduced = useReducedMotion();
    if (reduced) {
      return <Tag className={className} style={style}>{text}</Tag>;
    }
    const words = text.split(" ");
    let idx = 0;
    return (
      <Tag
        className={className}
        style={{ ...style, perspective: 700 }}
        aria-label={text}
      >
        {words.map((w, wi) => (
          <span
            key={wi}
            className="inline-block"
            style={{ whiteSpace: "pre" }}
            aria-hidden
          >
            {[...w].map((c, ci) => {
              const d = delay + idx * stagger;
              idx += 1;
              return (
                <motion.span
                  key={ci}
                  className="inline-block"
                  style={{ transformOrigin: "50% 100%" }}
                  initial={{ y: "110%", opacity: 0, rotateX: -85 }}
                  whileInView={{ y: "0%", opacity: 1, rotateX: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.75, delay: d, ease: [0.22, 1, 0.36, 1] }}
                >
                  {c}
                </motion.span>
              );
            })}
            {wi < words.length - 1 ? " " : ""}
          </span>
        ))}
      </Tag>
    );
  }
  