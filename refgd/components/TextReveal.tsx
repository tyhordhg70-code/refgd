"use client";

import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
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
 * v32 — opacity LATCHES at its maximum reached value. The raw
 * useScroll → useTransform mapping is symmetric: scrolling back up
 * past the element lowers scrollYProgress, which previously dropped
 * opacity from 1 back toward 0.15 and made the text visually
 * "vanish on rescroll" — the bug the user has been reporting across
 * every page of the site. We now subscribe to the raw scroll-derived
 * opacity and feed it into a separate MotionValue that only ever
 * monotonically increases. y / scale / blur / mask-position still
 * track scrollYProgress symmetrically because those are parallax
 * movement (cinematic) rather than visibility — only opacity
 * needed the one-way latch.
 *
 * Variants:
 *   wordFade   — opacity 0.15 → 1 per word (default, softest)
 *   wordBlur   — blur(8px) → blur(0) + opacity latch
 *   lineMask   — single-block clip-path slide-up + opacity latch
 *   wordSlide  — each word translates up + opacity latch
 *   charBounce — first-line hop on scroll + opacity latch
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

  // lineMask uses single transforms for the whole block.
  // maskY (clip-path translate) stays scroll-linked so the reveal
  // animates smoothly during scroll-down. maskOpacity is latched —
  // once reached 1, it stays at 1.
  const maskY = useTransform(scrollYProgress, [0, spread], ["100%", "0%"]);
  const maskOpacityRaw = useTransform(scrollYProgress, [0, spread / 2], [0, 1]);
  const maskOpacity = useLatchedMax(maskOpacityRaw, 0);

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

/**
 * Returns a MotionValue whose value is the running maximum of the
 * source MotionValue. Once it climbs to 1 (fully revealed) it never
 * comes back down on backscroll — fixes the user-reported
 * "text vanishes on rescroll" bug.
 */
function useLatchedMax(source: MotionValue<number>, initial = 0): MotionValue<number> {
  const latched = useMotionValue(initial);
  useMotionValueEvent(source, "change", (v) => {
    if (v > latched.get()) latched.set(v);
  });
  return latched;
}

/** Same idea, inverted — running MINIMUM (used for blur where 0 = clear). */
function useLatchedMin(source: MotionValue<number>, initial = Infinity): MotionValue<number> {
  const latched = useMotionValue(initial);
  useMotionValueEvent(source, "change", (v) => {
    if (v < latched.get()) latched.set(v);
  });
  return latched;
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
  // Raw scroll-derived values.
  const opacityRaw = useTransform(scroll, [start, end], [0.15, 1]);
  const blurRaw = useTransform(scroll, [start, end], [8, 0], { clamp: true });

  // Latched: opacity only goes up, blur only goes down. Once a word
  // is fully clear it stays that way through every future rescroll.
  const opacity = useLatchedMax(opacityRaw, 0.15);
  const blur = useLatchedMin(blurRaw, 8);

  // y + scale can keep tracking scroll symmetrically — they're
  // motion, not visibility. If a user wants to feel the parallax on
  // rescroll, that's fine; nothing disappears.
  const y = useTransform(scroll, [start, end], [22, 0], { clamp: true });
  const scale = useTransform(
    scroll,
    [start, (start + end) / 2, end],
    [0.85, 1.06, 1],
    { clamp: true },
  );
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
