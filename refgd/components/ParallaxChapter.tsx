"use client";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps a "chapter" section so that any background element you place
 * inside it scrolls SLOWER than the foreground content — producing a
 * 3D / layered parallax depth effect. Use:
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
 *  - `bg` is rendered at z-0, parallaxed.
 *  - children render at z-10 (normal scroll speed).
 *  - intensity 0..1 → how much the bg lags behind (higher = slower bg).
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
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Detect mobile so we can disable foreground parallax there. Mobile
  // browsers resize the viewport when the address bar shows / hides,
  // and percentage-based scroll transforms re-evaluate on every resize
  // — that's what produces the "Join Channel slightly jumps while
  // scrolling" effect. Background parallax stays enabled (it sits on a
  // fixed/absolute layer and isn't visually disturbed by the resize).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Background: slow rise from below, scale from 0.9, opacity in/out.
  // On mobile we ALSO disable bg parallax — percent-based transforms
  // re-evaluate every time the address bar shows/hides, which is what
  // produced the jumping/flickering on mobile scrolls.
  const bgY = useTransform(
    scrollYProgress,
    [0, 1],
    reduced || isMobile ? ["0%", "0%"] : [`${intensity * 50}%`, `-${intensity * 50}%`],
  );
  const bgScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    reduced || isMobile ? [1, 1, 1] : [0.92, 1.04, 0.98],
  );
  const bgOpacity = useTransform(scrollYProgress, [0, 0.18, 0.82, 1], [0, 1, 1, 0.35]);

  // Foreground: slight lift on entry then no movement (so users still
  // read it normally) — gives the depth sensation without making text move.
  // Disabled on mobile to prevent jitter from address-bar viewport resizes.
  const fgY = useTransform(
    scrollYProgress,
    [0, 0.25, 1],
    reduced || isMobile ? ["0%", "0%", "0%"] : ["6%", "0%", "-4%"],
  );

  // Hydration-safe motion-value styles. Framer-motion serialises a
  // `style="..."` attribute on the SSR pass for any motion-value-driven
  // style, but on the first client render rewrites it as a `transform`
  // string. React flags that as "Extra attributes from the server: style".
  // We dodge it by emitting the styles only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section ref={ref} className={`relative isolate ${className}`}>
      {bg && (
        <motion.div
          aria-hidden="true"
          style={mounted ? { y: bgY, scale: bgScale, opacity: bgOpacity } : undefined}
          suppressHydrationWarning
          className={`pointer-events-none z-0 ${bgClassName}`}
        >
          {bg}
        </motion.div>
      )}
      <motion.div
        style={mounted ? { y: fgY } : undefined}
        suppressHydrationWarning
        className="relative z-10"
      >
        {children}
      </motion.div>
    </section>
  );
}
