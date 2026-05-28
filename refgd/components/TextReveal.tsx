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
  spread?: number;
  style?: React.CSSProperties;
  variant?: Variant;
  editId?: string;
};

/**
 * v30 — mobile + desktop both run the FULL per-variant text
 * animations (blur, slide, wave, bounce, glitch). The only
 * difference between the two: mobile uses `animate` (mount-tween)
 * and desktop uses `whileInView` (scroll-trigger).
 *
 * Why this is safe on mobile:
 *
 *   • The original v25 GPU-layer concern (200+ will-change spans
 *     per long paragraph + 1000vh scroll bg = Chrome Android tile
 *     eviction) only applied while the spans were LONG-LIVED with
 *     active will-change AND repeatedly toggled in/out of view by
 *     IntersectionObserver. With mount-tween, each span animates
 *     once on mount and framer-motion automatically clears its
 *     will-change when the animation settles. Nothing stays
 *     promoted, nothing gets re-triggered by scroll.
 *
 *   • IntersectionObserver was the real bug — it intermittently
 *     failed to fire on Chrome Android and stranded entire
 *     paragraphs at opacity:0 forever. `animate` doesn't use IO
 *     at all, so this class of failure is eliminated.
 *
 *   • The `mounted` gate guarantees SSR + pre-hydration paint
 *     is always plain visible text, so even if hydration is
 *     delayed by the loading screen the content cannot be
 *     stranded blurred or invisible.
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

  // Helper to choose between mount-tween (mobile) and scroll-trigger (desktop).
  const triggerProps = mobile
    ? { initial: "hidden" as const, animate: "show" as const }
    : {
        initial: "hidden" as const,
        whileInView: "show" as const,
        viewport: { once: true, amount: 0.15 },
      };

  // Single-paragraph lineMask variant runs the blur-to-clear entrance.
  if (variant === "lineMask") {
    const Tag = motion[as as "p"] as typeof motion.p;
    const lineMaskMobile = mobile
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
        {...lineMaskMobile}
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
      {...triggerProps}
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
