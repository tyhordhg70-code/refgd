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

  // v29 — mobile text animation. Per-word stagger so the user can
  // actually SEE the animation happen (v28's single-element fade
  // was so brief and undifferentiated that the user perceived it
  // as "no animation"). Critical design choices for mobile safety:
  //
  //   • opacity-only (no transform, no blur, no filter). Plain
  //     opacity transitions on inline spans do NOT promote those
  //     spans to GPU layers, so we don't recreate the v25 problem
  //     of "200+ GPU layers per paragraph evicted by Chrome Android".
  //   • display: inline (not inline-block). inline-block forces
  //     each span into its own box and tempts the compositor to
  //     layer-promote it.
  //   • NO will-change set on the spans.
  //   • animate (not whileInView) — mount-tween entrance, no
  //     IntersectionObserver that could fail and strand the text
  //     invisible. Each paragraph animates as soon as it mounts,
  //     so by the time the user scrolls to below-fold content it
  //     is already visible.
  //   • Container stagger of 0.03s per word produces a clear
  //     left-to-right reveal "wave" that reads unmistakably as
  //     an animation.
  if (mobile) {
    const Tag = motion[as as "p"] as typeof motion.p;
    const mobileContainer: Variants = {
      hidden: {},
      show: {
        transition: { staggerChildren: 0.03, delayChildren: 0.05 },
      },
    };
    const mobileWord: Variants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      },
    };
    return (
      <Tag
        className={composedClassName}
        style={style}
        variants={mobileContainer}
        initial="hidden"
        animate="show"
        suppressHydrationWarning
      >
        {tokens.map((token, i) => {
          if (/^\s+$/.test(token)) return token;
          return (
            <motion.span key={i} variants={mobileWord} style={{ display: "inline" }}>
              {token}
            </motion.span>
          );
        })}
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
