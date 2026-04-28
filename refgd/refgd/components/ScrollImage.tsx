"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";

type Side = "left" | "right";

type Props = {
  src: string;
  alt?: string;
  side?: Side;
  /** Tailwind width class. Default keeps the image off the text column. */
  width?: string;
  /** Tailwind class for image height (used together with object-contain). */
  height?: string;
  /** Vertical pixel range it parallax-drifts during the section's scroll. */
  drift?: number;
  /** Glow tint behind the image. */
  glow?: "violet" | "cyan" | "amber" | "rose" | "none";
  className?: string;
  /** Extra translate-x offset (px) so the image floats slightly off-page. */
  bleed?: number;
  /** Forces the image absolutely-positioned inside its parent (for hero-style layouts). */
  absolute?: boolean;
  /**
   * When true the image renders in-flow (non-absolute) at its full
   * width — useful when the image is the focal element of the row,
   * e.g. side-by-side with text inside a grid cell. The breathing
   * float still animates.
   */
  inline?: boolean;
  /** When inline, controls visibility on small screens. */
  showOnMobile?: boolean;
  /**
   * Optional 3D tilt in degrees added to the parallax — gives the
   * image a "floating cube card" feel.
   */
  tilt?: number;
};

const GLOW: Record<NonNullable<Props["glow"]>, string> = {
  violet:
    "radial-gradient(closest-side, rgba(167,139,250,0.45), rgba(167,139,250,0) 70%)",
  cyan:
    "radial-gradient(closest-side, rgba(34,211,238,0.42), rgba(34,211,238,0) 70%)",
  amber:
    "radial-gradient(closest-side, rgba(251,191,36,0.42), rgba(251,191,36,0) 70%)",
  rose:
    "radial-gradient(closest-side, rgba(244,114,182,0.40), rgba(244,114,182,0) 70%)",
  none: "transparent",
};

/**
 * Side-floating storytelling illustration.
 *
 * Three modes:
 *   - default   → relative, parallax-translated, hidden on <lg
 *   - absolute  → positioned absolutely inside parent (sidekick to text)
 *   - inline    → centred in-flow, visible on every breakpoint
 *
 * Default: lives OUTSIDE the text column, drift + rotate on scroll,
 * breathing float, soft halo, hidden on small screens.
 */
export default function ScrollImage({
  src,
  alt = "",
  side = "left",
  width = "w-[320px] xl:w-[420px]",
  height = "h-[320px] xl:h-[420px]",
  drift = 140,
  glow = "violet",
  className = "",
  bleed = 0,
  absolute = false,
  inline = false,
  showOnMobile = true,
  tilt = 0,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);
  const rotate = useTransform(
    scrollYProgress,
    [0, 1],
    side === "left" ? [-6 - tilt, 6 + tilt] : [6 + tilt, -6 - tilt],
  );
  const rotateY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [tilt, 0, -tilt],
  );
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 1.04]);

  const sideClass =
    side === "left"
      ? "left-0 -translate-x-[6%] xl:-translate-x-[10%]"
      : "right-0 translate-x-[6%] xl:translate-x-[10%]";

  let wrapperBase: string;
  let visibilityClass: string;
  if (inline) {
    wrapperBase = "relative mx-auto";
    visibilityClass = showOnMobile ? "" : "hidden lg:block";
  } else if (absolute) {
    wrapperBase = `absolute top-1/2 -translate-y-1/2 ${sideClass}`;
    visibilityClass = "hidden lg:block";
  } else {
    wrapperBase = "relative";
    visibilityClass = showOnMobile ? "" : "hidden lg:block";
  }

  return (
    <motion.div
      ref={ref}
      style={
        reduce
          ? { transform: `translateX(${bleed}px)` }
          : { y, rotate, rotateY, scale, x: bleed, perspective: 1200, transformStyle: "preserve-3d" }
      }
      className={`pointer-events-none ${visibilityClass} ${wrapperBase} ${width} ${height} ${className}`}
      suppressHydrationWarning
    >
      {/* glow halo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 blur-2xl"
        style={{ background: GLOW[glow] }}
      />
      {/* breathing float keeps the panel alive even when the user pauses */}
      <motion.div
        animate={
          reduce
            ? {}
            : {
                y: [0, -14, 0, 14, 0],
                rotate: side === "left" ? [0, 1.5, 0, -1.5, 0] : [0, -1.5, 0, 1.5, 0],
              }
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="h-full w-full"
        suppressHydrationWarning
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
          style={{
            filter:
              "drop-shadow(0 30px 50px rgba(0,0,0,0.55)) drop-shadow(0 0 30px rgba(167,139,250,0.25))",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
