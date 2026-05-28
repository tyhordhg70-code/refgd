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
  spread?: number;
  style?: React.CSSProperties;
  variant?: Variant;
  editId?: string;
};

/**
 * v34 — desktop runs a v21-style SCROLL-LINKED progressive reveal:
 * each word (or char, for charBounce/charGlitch) reveals as the
 * scroll position passes its slot inside the paragraph. Reveal is
 * LATCHED — once a unit is shown it stays shown, so backscroll
 * never re-hides text (fixes the user-reported "text vanishes on
 * rescroll" bug across the site).
 *
 * Mobile keeps v30's mount-tween (single stagger on mount) because
 * Chrome Android intermittently drops 3D/blur layers on scroll-back
 * and IntersectionObserver-based reveal has been flaky on iOS Safari.
 *
 * All v30 variants are preserved (wordFade, wordBlur, wordSlide,
 * wordWave, charBounce, charGlitch, lineMask). editId / EditableText
 * / useEditContext integration is preserved verbatim from v30.
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

  if (!mounted || reduce) {
    const Plain = as as keyof JSX.IntrinsicElements;
    return (
      <Plain className={composedClassName} style={style} suppressHydrationWarning>
        {text}
      </Plain>
    );
  }

  // Single-block lineMask reveal (no per-word here — it's a one-piece
  // clip/blur transition, identical to v30).
  if (variant === "lineMask") {
    const Tag = motion[as as "p"] as typeof motion.p;
    const lm = mobile
      ? {
          initial: { opacity: 0, filter: "blur(6px)", y: 24 },
          animate: { opacity: 1, filter: "blur(0px)", y: 0 },
        }
      : {
          initial: { opacity: 0, filter: "blur(6px)", y: 24 },
          whileInView: { opacity: 1, filter: "blur(0px)", y: 0 },
          viewport: { once: true, amount: 0.15 },
        };
    return (
      <Tag
        className={composedClassName}
        style={style}
        {...lm}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        suppressHydrationWarning
      >
        {text}
      </Tag>
    );
  }

  const word = wordVariants(variant);
  const Tag = motion[as as "p"] as typeof motion.p;

  // Mobile = mount-tween with staggerChildren (v30 behavior verbatim).
  if (mobile) {
    const container: Variants = {
      hidden: {},
      show: {
        transition: {
          staggerChildren: variantStagger(variant),
          delayChildren: 0,
        },
      },
    };
    return (
      <Tag
        className={composedClassName}
        style={style}
        variants={container}
        initial="hidden"
        animate="show"
        suppressHydrationWarning
      >
        {variant === "charBounce" || variant === "charGlitch"
          ? renderChars(text, word)
          : renderWords(tokens, word)}
      </Tag>
    );
  }

  // Desktop = scroll-linked progressive reveal with latching.
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
    const ratio = Math.min(1, Math.max(0, v / spread));
    const next = Math.min(visibleUnitCount, Math.ceil(ratio * visibleUnitCount));
    setRevealedCount((prev) => (next > prev ? next : prev));
  });

  // Initial check — if the page mounted with scroll already past the
  // element (e.g. anchor link, back navigation), reveal immediately.
  useEffect(() => {
    const v = scrollYProgress.get();
    const ratio = Math.min(1, Math.max(0, v / spread));
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
      <motion.span key={i} variants={word} style={{ display: "inline-block" }} suppressHydrationWarning>
        {token}
      </motion.span>
    );
  });
}

function renderChars(text: string, char: Variants) {
  return text.split("").map((c, i) => {
    if (c === " ") return " ";
    return (
      <motion.span key={i} variants={char} style={{ display: "inline-block" }} suppressHydrationWarning>
        {c}
      </motion.span>
    );
  });
}
