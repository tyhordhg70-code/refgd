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
  // Snappy spring so a fast swipe still tracks scroll closely (no
  // visual lag where the user has scrolled but the cards are still
  // catching up — that's what made card 5 appear "skipped" before).
  const progress = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 36,
    mass: 0.2,
  });

  const count = cards.length;
  // Total horizontal distance: shift the row left by (count - 1)
  // viewport widths so the last card lands centred. We park the row
  // at its FINAL position by progress 0.92 — the remaining 8% of
  // runway is "settle time" so the user can actually see card 5
  // centred before the sticky disengages and vertical scroll resumes.
  const x = useTransform(
    progress,
    [0, 0.08, 0.92, 1],
    [
      `0vw`,
      `0vw`,
      `-${(count - 1) * 100}vw`,
      `-${(count - 1) * 100}vw`,
    ],
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
        // Runway height ≈ 0.7 viewports per card + a small buffer so
        // ONE swipe advances roughly one card and the user actually
        // sees every card in turn (the previous 1.0 vh-per-card
        // runway took 5+ swipes and made it feel like cards were
        // being skipped).
        height: `${(count * 0.7 + 0.5) * 100}svh`,
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
  // The horizontal track starts at x=0vw and parks at -(count-1)*100vw
  // by progress 0.92 (see x mapping in the parent). Each card "owns"
  // a centred window inside that travel:
  //
  //   centre_i = 0.08 + (0.92 - 0.08) * (i / (count - 1))
  //
  // so card 0 peaks at 0.08 (start of runway, with a small 8%
  // pre-roll where it sits centred and fully visible) and card N-1
  // peaks at 0.92 (then sits there for the closing 8% so the user
  // actually sees the last card before the section unpins).
  const SETTLE_IN = 0.08;
  const SETTLE_OUT = 0.92;
  const travelSpan = SETTLE_OUT - SETTLE_IN;
  const centre =
    count > 1 ? SETTLE_IN + travelSpan * (index / (count - 1)) : 0.5;
  const span = count > 1 ? travelSpan / (count - 1) : 1;

  // First card holds visible from progress 0; last card holds visible
  // through progress 1. Middle cards fade between their neighbours.
  const enter = index === 0 ? 0 : Math.max(0, centre - span);
  const leave = index === count - 1 ? 1 : Math.min(1, centre + span);

  // Use 5-stop interpolation (enter, justBeforePeak, peak, justAfterPeak,
  // leave) so the boundary cards keep a stable "fully visible" plateau
  // around the peak instead of starting to fade immediately.
  const peakHoldL = index === 0 ? 0 : Math.max(enter, centre - span * 0.15);
  const peakHoldR = index === count - 1 ? 1 : Math.min(leave, centre + span * 0.15);

  const opacity = useTransform(
    progress,
    [enter, peakHoldL, centre, peakHoldR, leave],
    [
      index === 0 ? 1 : 0.15,
      1,
      1,
      1,
      index === count - 1 ? 1 : 0.35,
    ],
  );
  const scale = useTransform(
    progress,
    [enter, peakHoldL, centre, peakHoldR, leave],
    [
      index === 0 ? 1 : 0.82,
      1,
      1,
      1,
      index === count - 1 ? 1 : 0.86,
    ],
  );
  const rotateY = useTransform(
    progress,
    [enter, peakHoldL, centre, peakHoldR, leave],
    [
      index === 0 ? 0 : 22,
      0,
      0,
      0,
      index === count - 1 ? 0 : -16,
    ],
  );
  const liftY = useTransform(
    progress,
    [enter, peakHoldL, centre, peakHoldR, leave],
    [
      index === 0 ? "0%" : "6%",
      "0%",
      "0%",
      "0%",
      index === count - 1 ? "0%" : "-4%",
    ],
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
