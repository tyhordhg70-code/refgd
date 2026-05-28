"use client";

import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

type Variant =
  | "wordFade"
  | "wordBlur"
  | "lineMask"
  | "wordSlide"
  | "charBounce"
  | "wordWave"
  | "charGlitch";

type Props = {
  children: string;
  className?: string;
  as?: "p" | "h1" | "h2" | "h3" | "h4" | "div" | "span";
  spread?: number;
  style?: React.CSSProperties;
  variant?: Variant;
  editId?: string;
};

/**
 * v39 — STAGGERED whileInView entrance for BOTH mobile and desktop.
 *
 * Each word (or char, for charBounce/charGlitch) is a motion.span that
 * animates from `hidden` to `show`. A parent container drives the cascade
 * with `staggerChildren`, fired by `whileInView` with `viewport.once =
 * true`.
 *
 * Why this and not the v38 scroll-linked reveal: the scroll-linked
 * version tied each unit to a slice of the element's scrollYProgress.
 * For paragraphs near the BOTTOM of the page (e.g. the final
 * "suitable for EVERYONE … WORLDWIDE" line, which sits just above the
 * footer CTA) the page can't scroll far enough for progress to reach the
 * end, so the trailing words/chars never revealed — the text appeared to
 * "cut off and vanish". A time-based stagger fired once on entry ALWAYS
 * completes, regardless of where the element sits on the page.
 *
 * Latching: `viewport.once = true` means the entrance fires exactly once
 * as the element scrolls into view and then stays in its `show` state
 * forever — backscroll can never re-hide it (the "text vanishes on
 * rescroll" bug). This is reliable on iOS Safari / Chrome Android.
 *
 * All variants are preserved (wordFade, wordBlur, wordSlide, wordWave,
 * charBounce, charGlitch, lineMask). editId / EditableText /
 * useEditContext integration is preserved verbatim.
 */
export default function TextReveal({
  children,
  className = "",
  as = "p",
  spread = 0.6,
  style,
  variant = "wordFade",
  editId,
}: Props) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const ctx = useEditContext();
  const editing = !!editId && ctx.isAdmin && ctx.editMode;
  const text = editId ? ctx.getValue(editId, children) : children;
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);

  if (editing) {
    return (
      <EditableText
        id={editId!}
        defaultValue={children}
        as={as}
        multiline
        className={className}
      />
    );
  }

  const composedClassName = `${className} whitespace-pre-line`.trim();

  if (!mounted || reduce) {
    const Plain = as as keyof JSX.IntrinsicElements;
    return (
      <Plain className={composedClassName} style={style} suppressHydrationWarning>
        {text}
      </Plain>
    );
  }

  // Single-block lineMask reveal (no per-word here — it's a one-piece
  // clip/blur transition). whileInView + once:true so it reveals as the
  // block scrolls in and latches (never re-hides).
  if (variant === "lineMask") {
    const Tag = motion[as as "p"] as typeof motion.p;
    return (
      <Tag
        className={composedClassName}
        style={style}
        initial={{ opacity: 0, filter: "blur(6px)", y: 24 }}
        whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        suppressHydrationWarning
      >
        {text}
      </Tag>
    );
  }

  const word = wordVariants(variant);
  const isChar = variant === "charBounce" || variant === "charGlitch";

  // Build the unit list: per-character for char variants, per-token
  // (word + whitespace) otherwise. Whitespace is rendered as plain text
  // so it never animates and word spacing is preserved.
  const units: { value: string; isSpace: boolean; key: number }[] = isChar
    ? text.split("").map((c, i) => ({ value: c, isSpace: c === " ", key: i }))
    : tokens.map((tok, i) => ({ value: tok, isSpace: /^\s+$/.test(tok), key: i }));

  // Stagger is tuned per unit type and damped by `spread` so callers can
  // make a reveal snappier or slower. Char variants use a tighter stagger
  // because there are many more units.
  const baseStep = isChar ? 0.018 : 0.045;
  const step = baseStep * (spread > 0 ? spread : 0.6) * (1 / 0.6);

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: step },
    },
  };

  const Tag = motion[as as "p"] as typeof motion.p;

  return (
    <Tag
      className={composedClassName}
      style={style}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      suppressHydrationWarning
    >
      {units.map((u) =>
        u.isSpace ? (
          u.value
        ) : (
          <motion.span
            key={u.key}
            variants={word}
            style={{ display: "inline-block" }}
            suppressHydrationWarning
          >
            {u.value}
          </motion.span>
        ),
      )}
    </Tag>
  );
}

function wordVariants(v: Variant): Variants {
  switch (v) {
    case "wordBlur":
      return {
        hidden: { opacity: 0, filter: "blur(8px)", y: 10 },
        show: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
      };
    case "wordSlide":
      return {
        hidden: { opacity: 0, x: -16, y: 0 },
        show: { opacity: 1, x: 0, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
      };
    case "wordWave":
      return {
        hidden: { opacity: 0, y: 18, rotateX: -30 },
        show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
      };
    case "charBounce":
      return {
        hidden: { opacity: 0, y: 12, scale: 0.7 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 420, damping: 16 } },
      };
    case "charGlitch":
      return {
        hidden: { opacity: 0, x: -2, skewX: 8, filter: "blur(4px)" },
        show: { opacity: 1, x: 0, skewX: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
      };
    case "wordFade":
    default:
      return {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
      };
  }
}
