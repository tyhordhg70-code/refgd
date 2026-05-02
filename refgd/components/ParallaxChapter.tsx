"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useEditContext } from "@/lib/edit-context";

/**
 * Wraps a "chapter" section so any background element you place inside
 * fades + lifts into place once the section enters the viewport, then
 * stays put — no per-frame scroll-driven transforms.
 *
 * Was previously scroll-driven (useScroll + useTransform), which made
 * EVERY page require constant scrolling to advance the parallax and
 * pinned a heavy compositor cost across the whole document. Now it's
 * a one-shot viewport-triggered reveal that plays through cleanly
 * (stop-motion feel) and frees the scroll thread.
 *
 *   <ParallaxChapter
 *     bg={<ParallaxIllustration kind="shield" accent="cyan" size={400} />}
 *     bgClassName="absolute right-[4%] top-1/2 -translate-y-1/2"
 *     intensity={0.45}
 *   >
 *     <ChapterHeader ... />
 *     <Cards ... />
 *   </ParallaxChapter>
 *
 *  - `bg` renders at z-0, fades + drifts in once.
 *  - children render at z-10 with a small one-shot lift.
 *  - intensity 0..1 controls bg drift distance.
 */
export default function ParallaxChapter({
  bg,
  bgClassName = "absolute inset-0 grid place-items-center opacity-30",
  intensity = 0.4,
  className = "",
  children,
}: {
  bg?: ReactNode;
  bgClassName?: string;
  intensity?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  // Disable parallax transforms while admin is editing — the
  // motion-driven `style.transform` on the foreground container
  // creates a containing block that interferes with contentEditable
  // focus and caret positioning inside nested EditableText nodes.
  const { isAdmin, editMode } = useEditContext();
  const editing = isAdmin && editMode;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const disable = reduced || editing || isMobile;

  // Background: small downward drift + scale + fade-in on enter.
  const bgInitial = disable
    ? { opacity: 1 }
    : { opacity: 0, y: `${intensity * 12}%`, scale: 0.97 };
  const bgAnimate = { opacity: 1, y: "0%", scale: 1 };

  // Foreground: subtle 6% lift on enter, no continuous scroll motion.
  const fgInitial = disable ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 };
  const fgAnimate = { opacity: 1, y: 0 };

  // v6 (2026-05): switched from `whileInView` to `animate` so the
  // chapter entrance plays on mount rather than depending on
  // IntersectionObserver — the same observer race that was leaving
  // GlassCards stuck invisible was making chapters feel "flat".

  return (
    <section className={`relative isolate ${className}`}>
      {bg && (
        <motion.div
          aria-hidden="true"
          initial={mounted ? bgInitial : { opacity: 0 }}
          animate={bgAnimate}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          suppressHydrationWarning
          className={`pointer-events-none z-0 ${bgClassName}`}
        >
          {bg}
        </motion.div>
      )}
      <motion.div
        initial={mounted ? fgInitial : undefined}
        animate={fgAnimate}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        suppressHydrationWarning
        className="relative z-10"
      >
        {children}
      </motion.div>
    </section>
  );
}
