"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * PathsHorizontalReveal — MOBILE ONLY scroll-jacking layout for the
 * five path cards.
 *
 * On mobile we don't have horizontal screen real-estate to fan five
 * cards out diagonally, so we fake a cinematic "camera tracks
 * sideways" reveal:
 *
 *   • The whole component takes a tall vertical scroll runway
 *     (≈ 5 × 100svh) and pins a 100svh sticky stage inside.
 *   • As the user scrolls vertically, the row of cards translates
 *     horizontally (right → left), each card sliding in from off-
 *     screen with a slight diagonal zoom and tilt.
 *   • Once the runway is exhausted (all 5 cards revealed), the
 *     section unpins and normal vertical scroll resumes for whatever
 *     comes next.
 *
 * On desktop and tablet (≥ 768px) we fall back to rendering the
 * children in the parent grid — this component returns null then so
 * the existing `<div className="grid grid-cols-… xl:grid-cols-5">`
 * picks up the cards directly.
 */
export default function PathsHorizontalReveal({
  cards,
  desktopFallback,
}: {
  /** Pre-built card React nodes, in order. Should be 5 for the
   *  current home page but the component is resilient to any count. */
  cards: ReactNode[];
  /** What to render on tablet / desktop. Typically the existing grid. */
  desktopFallback: ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  // Smooth the scroll input so the horizontal travel doesn't snap
  // with every wheel tick on iOS / Android.
  const progress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 28,
    mass: 0.5,
  });

  const count = cards.length;
  // Total horizontal distance: shift the row left by (count - 1)
  // viewport widths so the last card lands centred. Uses CSS calc
  // string interpolation via Framer's MotionValue<string>.
  const x = useTransform(
    progress,
    [0, 1],
    [`0vw`, `-${(count - 1) * 100}vw`],
  );

  // SSR / desktop / tablet: render the desktop grid as-is.
  if (!mounted || !isMobile) {
    return <>{desktopFallback}</>;
  }

  return (
    <section
      ref={sectionRef}
      data-testid="paths-horizontal-reveal"
      className="relative w-full"
      style={{
        // Runway height = (cards + 0.5) viewports so each card has a
        // clear "page" of scroll, and the section unpins cleanly with
        // a small buffer once the last card is centred.
        height: `${(count + 0.5) * 100}svh`,
      }}
    >
      <div className="sticky top-0 flex h-[100svh] w-full items-center overflow-hidden">
        <motion.div
          className="flex h-full flex-row items-center"
          style={{
            x,
            willChange: "transform",
          }}
        >
          {cards.map((card, i) => (
            <CardSlide key={i} index={i} progress={progress} count={count}>
              {card}
            </CardSlide>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * A single card-width "slide" inside the horizontal track. Each
 * slide also gets its own tilt / zoom keyed to the master scroll
 * progress so the reveal feels like a cinematic camera fly-by, not
 * a flat carousel.
 */
function CardSlide({
  index,
  count,
  progress,
  children,
}: {
  index: number;
  count: number;
  progress: ReturnType<typeof useSpring>;
  children: ReactNode;
}) {
  // Each card "owns" a window of scroll progress around its centre.
  // For card i (0-indexed), centre = i / (count - 1).
  const centre = count > 1 ? index / (count - 1) : 0;
  const span = count > 1 ? 1 / (count - 1) : 1; // window radius
  const enter = Math.max(0, centre - span * 0.85);
  const peak = centre;
  const leave = Math.min(1, centre + span * 0.85);

  // Cinematic camera fly-by: each card eases in from the right with
  // a diagonal lift, peaks at full presence, then drifts away. The
  // first and last cards skip the entry/exit fade respectively so
  // the row never has both edges blank at once.
  const opacity = useTransform(
    progress,
    [enter, peak, leave],
    [index === 0 ? 1 : 0.15, 1, index === count - 1 ? 1 : 0.45],
  );
  const scale = useTransform(
    progress,
    [enter, peak, leave],
    [0.78, 1, 0.86],
  );
  const rotateY = useTransform(
    progress,
    [enter, peak, leave],
    [22, 0, -16],
  );
  const liftY = useTransform(
    progress,
    [enter, peak, leave],
    ["6%", "0%", "-4%"],
  );

  return (
    <div
      className="flex h-full w-screen shrink-0 items-center justify-center px-6"
      style={{ perspective: 1400 }}
    >
      <motion.div
        className="w-full max-w-[26rem]"
        style={{
          opacity,
          scale,
          rotateY,
          y: liftY,
          transformStyle: "preserve-3d",
          transformOrigin: "50% 50%",
          willChange: "transform, opacity",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
