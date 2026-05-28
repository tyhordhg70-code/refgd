"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useMotionValueEvent,
  type Variants,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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
 * v38 — BOTH mobile and desktop run the SCROLL-LINKED progressive reveal:
 * each word (or char, for charBounce/charGlitch) reveals as the scroll
 * position passes its slot inside the paragraph. Reveal is LATCHED — once
 * a unit is shown it stays shown (monotonic max), so backscroll never
 * re-hides text.
 *
 * Mobile previously used a mount-tween (single stagger that fired on
 * mount). That meant the animation finished before the user scrolled the
 * paragraph into view, so on mobile the text just sat there static — the
 * "all animations are gone on mobile" report. The scroll-linked latched
 * reveal is driven by useScroll (no IntersectionObserver), so it is
 * robust on iOS Safari / Chrome Android and, because it latches, it can
 * never leave a word stuck invisible.
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

  // Mobile AND desktop = scroll-linked progressive reveal with latching.
  return (
    <DesktopProgressive
      as={as}
      className={composedClassName}
      style={style}
      text={text}
      tokens={tokens}
      variant={variant}
      word={word}
      spread={spread}
    />
  );
}

/**
 * Splits the paragraph into per-word (or per-char) units, ties each
 * unit to a slice of scrollYProgress, and reveals it when scroll
 * passes that slot. A single MotionValue listener tracks the running
 * MAX revealed-count, so once a word is shown it stays shown
 * regardless of how the user scrolls afterward.
 */
function DesktopProgressive({
  as,
  className,
  style,
  text,
  tokens,
  variant,
  word,
  spread,
}: {
  as: NonNullable<Props["as"]>;
  className: string;
  style?: React.CSSProperties;
  text: string;
  tokens: string[];
  variant: Variant;
  word: Variants;
  spread: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref as React.RefObject<HTMLElement>,
    offset: ["start 88%", "end 35%"],
  });

  const isChar = variant === "charBounce" || variant === "charGlitch";

  // Pre-compute unit list so we know total count for slot math.
  const units = useMemo(() => {
    if (isChar) {
      return text.split("").map((c, i) => ({ kind: "unit" as const, value: c, key: i, isSpace: c === " " }));
    }
    return tokens.map((tok, i) => ({
      kind: "unit" as const,
      value: tok,
      key: i,
      isSpace: /^\s+$/.test(tok),
    }));
  }, [text, tokens, isChar]);

  const visibleUnitCount = units.filter((u) => !u.isSpace).length || 1;

  const [revealedCount, setRevealedCount] = useState(0);

  // Listener: convert scroll progress into a count of revealed units.
  // Latches via monotonic max — count can only go up.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const safeSpread = spread > 0 ? spread : 0.6;
    const ratio = Math.min(1, Math.max(0, v / safeSpread));
    const next = Math.min(visibleUnitCount, Math.ceil(ratio * visibleUnitCount));
    setRevealedCount((prev) => (next > prev ? next : prev));
  });

  // Initial check — if the page mounted with scroll already past the
  // element (e.g. anchor link, back navigation), reveal immediately.
  useEffect(() => {
    const v = scrollYProgress.get();
    const safeSpread = spread > 0 ? spread : 0.6;
    const ratio = Math.min(1, Math.max(0, v / safeSpread));
    const next = Math.min(visibleUnitCount, Math.ceil(ratio * visibleUnitCount));
    if (next > 0) setRevealedCount((prev) => (next > prev ? next : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Tag = motion[as as "p"] as typeof motion.p;

  // Walk units, assigning each non-space unit a 0-based visible index.
  let visIdx = -1;
  const children = units.map((u) => {
    if (u.isSpace) return u.value;
    visIdx += 1;
    const idx = visIdx;
    return (
      <motion.span
        key={u.key}
        variants={word}
        initial="hidden"
        animate={idx < revealedCount ? "show" : "hidden"}
        style={{ display: "inline-block" }}
        suppressHydrationWarning
      >
        {u.value}
      </motion.span>
    );
  });

  return (
    <Tag
      ref={ref as React.Ref<HTMLParagraphElement>}
      className={className}
      style={style}
      suppressHydrationWarning
    >
      {children}
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
