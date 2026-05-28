"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";
import { isMobileLike } from "@/lib/iosCheck";

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

export default function TextReveal({
  children,
  className = "",
  as = "p",
  style,
  variant = "wordFade",
  editId,
}: Props) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(isMobileLike());
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

  // v28 — SSR + pre-hydration paint is ALWAYS plain visible text.
  // The mobile/desktop animation branches below only run after the
  // useEffect resolves what device this is. This eliminates two
  // user-visible bugs from v25:
  //   1. The desktop "lineMask" branch's `initial={filter:blur(6px)}`
  //      was being SSR'd to mobile devices, leaving paragraphs
  //      blurred on first paint and stranding them blurred whenever
  //      the IntersectionObserver flake fired late (or at all).
  //   2. Hydration mismatch between server (always desktop variant
  //      tree) and client (mobile variant tree) was unmounting one
  //      motion subtree and remounting the other, occasionally
  //      losing the animation entirely.
  if (!mounted || reduce) {
    const Plain = as as keyof JSX.IntrinsicElements;
    if (reduce) {
      return (
        <Plain className={composedClassName} style={style}>
          {text}
        </Plain>
      );
    }
    // Pre-hydration: render the *visible* end state so nothing
    // can possibly be stranded blurred or transparent. After
    // mount we will replace this with the animated motion tree.
    return (
      <Plain className={composedClassName} style={style} suppressHydrationWarning>
        {text}
      </Plain>
    );
  }

  // v28 — on mobile, use `animate` (plays on mount) instead of
  // `whileInView` (IntersectionObserver-driven). The IO path was
  // intermittently failing on Chrome Android — same root cause that
  // forced isMobileLike() to be used by Reveal/SafeReveal/KineticText/
  // LedTicker. Mount-tween animations never strand content invisible
  // because they don't depend on any observer firing. Below-fold
  // paragraphs animate by the time the user scrolls there and just
  // appear naturally, which is the expected mobile experience.
  if (mobile) {
    const Tag = motion[as as "p"] as typeof motion.p;
    return (
      <Tag
        className={composedClassName}
        style={style}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        suppressHydrationWarning
      >
        {text}
      </Tag>
    );
  }

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

  const Tag = motion[as as "p"] as typeof motion.p;
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
      viewport={{ once: true, amount: 0.15 }}
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

function renderWords(tokens: string[], word: Variants) {
  return tokens.map((token, i) => {
    if (/^\s+$/.test(token)) return token;
    return (
      <motion.span key={i} variants={word} style={{ display: "inline-block", willChange: "transform, opacity, filter" }} suppressHydrationWarning>
        {token}
      </motion.span>
    );
  });
}

function renderChars(text: string, char: Variants) {
  return text.split("").map((c, i) => {
    if (c === " ") return " ";
    return (
      <motion.span key={i} variants={char} style={{ display: "inline-block", willChange: "transform, opacity, filter" }} suppressHydrationWarning>
        {c}
      </motion.span>
    );
  });
}
