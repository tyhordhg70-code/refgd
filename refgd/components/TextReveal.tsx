"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useMemo } from "react";
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
  /** Kept for API compatibility — no longer drives scroll progress. */
  spread?: number;
  style?: React.CSSProperties;
  variant?: Variant;
  /** Stable content-id; when set the block becomes editable in admin edit mode. */
  editId?: string;
};

/**
 * One-shot in-view text reveal — the animation always completes
 * fully when the block enters the viewport, regardless of how
 * fast the user scrolls.
 *
 * Variants give each section its own personality so the page
 * never feels like the same effect repeating.
 *
 * Pass `editId` to make the block inline-editable for admins.
 */
export default function TextReveal({
  children,
  className = "",
  as = "p",
  style,
  variant = "wordFade",
  editId,
}: Props) {
  const reduce = useReducedMotion();
  const ctx = useEditContext();
  const editing = !!editId && ctx.isAdmin && ctx.editMode;
  const text = editId ? ctx.getValue(editId, children) : children;
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);

  // Edit mode: short-circuit the animation and render a plain editable
  // element so admin click-to-edit works.
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

  // Both variants use `whitespace-pre-line` so the rendered text wrapping
  // matches the EditableText (edit-mode) block exactly. Without this the
  // edit-mode and view-mode blocks could break onto different lines and
  // appear "misaligned".
  const composedClassName = `${className} whitespace-pre-line`.trim();

  if (reduce) {
    const Plain = as as keyof JSX.IntrinsicElements;
    return (
      <Plain className={composedClassName} style={style}>
        {text}
      </Plain>
    );
  }

  if (variant === "lineMask") {
    // Was previously a clipPath-based reveal — clipPath inside a 3D
    // (transform-style: preserve-3d) ancestor like CubicParallax fails
    // to repaint reliably in Chromium and left the paragraph permanently
    // invisible. Switched to a plain opacity + filter + y entrance which
    // composites cleanly in any 3D context.
    const Tag = motion[as as "p"] as typeof motion.p;
    return (
      <Tag
        className={composedClassName}
        style={style}
        initial={{ opacity: 0, filter: "blur(6px)", y: 24 }}
        whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        suppressHydrationWarning
      >
        {text}
      </Tag>
    );
  }

  const Tag = motion[as as "p"] as typeof motion.p;

  // Container drives stagger; child variants drive the visual.
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: variantStagger(variant), delayChildren: 0 } },
  };

  const word = wordVariants(variant);

  return (
    <Tag
      className={composedClassName}
      style={style}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      suppressHydrationWarning
    >
      {variant === "charBounce" || variant === "charGlitch"
        ? renderChars(text, word)
        : renderWords(tokens, word)}
    </Tag>
  );
}

function variantStagger(v: Variant): number {
  switch (v) {
    case "charBounce":
    case "charGlitch":
      return 0.012;
    case "wordWave":
      return 0.03;
    default:
      return 0.022;
  }
}

function wordVariants(v: Variant): Variants {
  switch (v) {
    case "wordBlur":
      return {
        hidden: { opacity: 0, filter: "blur(8px)", y: 10 },
        show: {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        },
      };
    case "wordSlide":
      return {
        hidden: { opacity: 0, x: -16, y: 0 },
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
        },
      };
    case "wordWave":
      return {
        hidden: { opacity: 0, y: 18, rotateX: -30 },
        show: {
          opacity: 1,
          y: 0,
          rotateX: 0,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
        },
      };
    case "charBounce":
      return {
        hidden: { opacity: 0, y: 12, scale: 0.7 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: "spring", stiffness: 420, damping: 16 },
        },
      };
    case "charGlitch":
      return {
        hidden: { opacity: 0, x: -2, skewX: 8, filter: "blur(4px)" },
        show: {
          opacity: 1,
          x: 0,
          skewX: 0,
          filter: "blur(0px)",
          transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        },
      };
    case "wordFade":
    default:
      return {
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
        },
      };
  }
}

function renderWords(tokens: string[], word: Variants) {
  return tokens.map((token, i) => {
    if (/^\s+$/.test(token)) return token;
    return (
      <motion.span
        key={i}
        variants={word}
        style={{ display: "inline-block", willChange: "transform, opacity, filter" }}
        suppressHydrationWarning
      >
        {token}
      </motion.span>
    );
  });
}

function renderChars(text: string, char: Variants) {
  return text.split("").map((c, i) => {
    if (c === " ") return " ";
    return (
      <motion.span
        key={i}
        variants={char}
        style={{ display: "inline-block", willChange: "transform, opacity, filter" }}
        suppressHydrationWarning
      >
        {c}
      </motion.span>
    );
  });
}
