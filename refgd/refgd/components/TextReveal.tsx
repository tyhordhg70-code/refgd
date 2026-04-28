"use client";

import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { useMemo, useRef } from "react";

type Variant = "wordFade" | "wordBlur" | "lineMask" | "wordSlide" | "charBounce";

type Props = {
  children: string;
  className?: string;
  /** Element used for the wrapping block. */
  as?: "p" | "h1" | "h2" | "h3" | "h4" | "div" | "span";
  /**
   * Spread the per-word activation across this fraction of the
   * scroll-progress range (0..1). Smaller = snappier reveal.
   */
  spread?: number;
  /** Optional inline style passthrough (e.g. text-shadow). */
  style?: React.CSSProperties;
  /**
   * Animation flavour. Different sections of the page should pick
   * different variants so the page doesn't feel like the same
   * effect repeating endlessly.
   */
  variant?: Variant;
};

/**
 * Scroll-synchronised text reveal with multiple flavours.
 *
 * `wordFade`   — opacity 0.18 → 1 per word (default, softest)
 * `wordBlur`   — blur(8px) → blur(0) per word, snappy
 * `lineMask`   — clip-path slide-up of the whole block
 * `wordSlide`  — each word translates up + fades in
 * `charBounce` — first-line char-by-char hop on scroll
 *
 * Each variant uses scrollYProgress so it stays in sync with the
 * user's scrolling rather than firing once on viewport entry.
 */
export default function TextReveal({
  children,
  className = "",
  as = "p",
  spread = 0.6,
  style,
  variant = "wordFade",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 88%", "end 35%"],
  });

  const tokens = useMemo(() => children.split(/(\s+)/), [children]);
  const wordOnly = tokens.filter((w) => !/^\s+$/.test(w));
  const total = wordOnly.length || 1;

  // lineMask uses a single transform for the whole block.
  const maskY = useTransform(scrollYProgress, [0, spread], ["100%", "0%"]);
  const maskOpacity = useTransform(scrollYProgress, [0, spread / 2], [0, 1]);

  if (reduce) {
    const Plain = as as keyof JSX.IntrinsicElements;
    return (
      <Plain className={className} style={style}>
        {children}
      </Plain>
    );
  }

  if (variant === "lineMask") {
    const Tag = motion[as as "p"] as typeof motion.p;
    return (
      <Tag
        ref={ref as never}
        className={className}
        style={{ ...style, opacity: maskOpacity, y: maskY }}
        suppressHydrationWarning
      >
        {children}
      </Tag>
    );
  }

  const Tag = motion[as as "p"] as typeof motion.p;
  let wordIdx = -1;

  return (
    <Tag ref={ref as never} className={className} style={style} suppressHydrationWarning>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return token;
        wordIdx += 1;
        const start = (wordIdx / total) * spread;
        const end = Math.min(1, start + spread / 2);
        return (
          <Word
            key={i}
            text={token}
            start={start}
            end={end}
            scroll={scrollYProgress}
            variant={variant}
          />
        );
      })}
    </Tag>
  );
}

function Word({
  text,
  start,
  end,
  scroll,
  variant,
}: {
  text: string;
  start: number;
  end: number;
  scroll: MotionValue<number>;
  variant: Variant;
}) {
  const opacity = useTransform(scroll, [start, end], [0.15, 1]);
  const blur = useTransform(scroll, [start, end], [8, 0], { clamp: true });
  const y = useTransform(scroll, [start, end], [22, 0], { clamp: true });
  const scale = useTransform(scroll, [start, (start + end) / 2, end], [0.85, 1.06, 1], { clamp: true });
  const filter = useTransform(blur, (b) => `blur(${b}px)`);

  const baseStyle: React.CSSProperties = {
    display: "inline-block",
    willChange: "opacity, transform, filter",
  };

  if (variant === "wordBlur") {
    return (
      <motion.span style={{ ...baseStyle, opacity, filter }} suppressHydrationWarning>
        {text}
      </motion.span>
    );
  }
  if (variant === "wordSlide") {
    return (
      <motion.span style={{ ...baseStyle, opacity, y }} suppressHydrationWarning>
        {text}
      </motion.span>
    );
  }
  if (variant === "charBounce") {
    return (
      <motion.span style={{ ...baseStyle, opacity, scale }} suppressHydrationWarning>
        {text}
      </motion.span>
    );
  }
  // default wordFade
  return (
    <motion.span style={{ ...baseStyle, opacity }} suppressHydrationWarning>
      {text}
    </motion.span>
  );
}
