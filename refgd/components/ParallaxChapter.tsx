"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEditContext } from "@/lib/edit-context";

/**
 * Wraps a "chapter" section so any background element you place inside
 * lifts/drifts as the user scrolls past it.
 *
 *   Desktop: REAL scroll-driven parallax (useScroll + useTransform).
 *     The bg element drifts down, scales, and the foreground gently
 *     lifts as the section moves through the viewport. This is the
 *     "scroll moves the cards" feel the design originally had.
 *   Mobile / reduced motion / admin edit mode: one-shot fade+lift on
 *     viewport entry. iPhone Safari can't afford a per-scroll
 *     framer-motion useTransform pipeline on top of the worker, the
 *     PathIllustration timelines, and KineticText, so we keep the
 *     mobile path lightweight.
 *
 *   <ParallaxChapter
 *     bg={<ParallaxIllustration kind="shield" accent="cyan" size={400} />}
 *     bgClassName="absolute right-[4%] top-1/2 -translate-y-1/2"
 *     intensity={0.45}
 *   >
 *     <ChapterHeader ... />
 *     <Cards ... />
 *   </ParallaxChapter>
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

  // disable continuous scroll-driven parallax when:
  //   - user prefers reduced motion
  //   - admin is editing (caret positioning relies on no transform parents)
  //   - we're on mobile (iPhone Safari can't sustain per-scroll
  //     useTransform alongside the worker + KineticText)
  const disable = reduced || editing || isMobile;

  // Scroll-driven (desktop) — track the section's progress through the
  // viewport from "section bottom enters viewport bottom" to
  // "section top exits viewport top".
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Background drifts down + scales up over the section's scroll range.
  // Foreground gently lifts.
  const bgY     = useTransform(scrollYProgress, [0, 1], [`-${intensity * 14}%`, `${intensity * 14}%`]);
  const bgScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.94, 1.0, 1.06]);
  const bgOp    = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.7]);
  const fgY     = useTransform(scrollYProgress, [0, 1], [intensity * 22, -intensity * 22]);

  return (
    <section ref={sectionRef} className={`relative isolate ${className}`}>
      {bg && (
        // OUTER wrapper: owns all positioning classes (absolute, top-/right-/
        // -translate-y-1/2, hidden lg:block, etc) so Tailwind transform
        // utilities aren't overridden by motion's inline transform.
        // INNER motion wrapper: owns the parallax animation (transform/opacity).
        <div
          aria-hidden="true"
          className={`pointer-events-none z-0 ${bgClassName}`}
        >
          {disable ? (
            <motion.div
              initial={mounted ? { opacity: 0, y: `${intensity * 12}%`, scale: 0.97 } : { opacity: 0 }}
              whileInView={{ opacity: 1, y: "0%", scale: 1 }}
              viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              suppressHydrationWarning
            >
              {bg}
            </motion.div>
          ) : (
            <motion.div
              style={{ y: bgY, scale: bgScale, opacity: bgOp }}
              suppressHydrationWarning
            >
              {bg}
            </motion.div>
          )}
        </div>
      )}
      {disable ? (
        <motion.div
          initial={mounted ? { opacity: 0, y: 14 } : undefined}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          suppressHydrationWarning
          className="relative z-10"
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          style={{ y: fgY }}
          suppressHydrationWarning
          className="relative z-10"
        >
          {children}
        </motion.div>
      )}
    </section>
  );
}
