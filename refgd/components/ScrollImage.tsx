"use client";

import { motion, useReducedMotion } from "framer-motion";

type Side = "left" | "right";

type Props = {
  src: string;
  alt?: string;
  side?: Side;
  /** Tailwind width class. Default keeps the image off the text column. */
  width?: string;
  /** Tailwind class for image height (used together with object-contain). */
  height?: string;
  /** Kept for API compatibility — no longer used. */
  drift?: number;
  /** Glow tint behind the image. */
  glow?: "violet" | "cyan" | "amber" | "rose" | "none";
  className?: string;
  /** Extra translate-x offset (px). */
  bleed?: number;
  /** Forces the image absolutely-positioned inside its parent. */
  absolute?: boolean;
  /** When true the image renders in-flow (non-absolute) at its full width. */
  inline?: boolean;
  /** When inline, controls visibility on small screens. */
  showOnMobile?: boolean;
  /** Optional 3D tilt in degrees added to the entrance. */
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
 * Side-floating illustration with a one-shot in-view entrance and a
 * gentle CSS-only breathing float. No scroll listeners — animations
 * cannot stutter when the user scrolls past mid-frame.
 */
export default function ScrollImage({
  src,
  alt = "",
  side = "left",
  width = "w-[320px] xl:w-[420px]",
  height = "h-[320px] xl:h-[420px]",
  glow = "violet",
  className = "",
  bleed = 0,
  absolute = false,
  inline = false,
  showOnMobile = true,
  tilt = 0,
}: Props) {
  const reduce = useReducedMotion();

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

  const enterX = side === "left" ? -40 : 40;

  return (
    <motion.div
      initial={
        reduce
          ? { opacity: 1 }
          : { opacity: 0, x: enterX + bleed, y: 30, rotate: side === "left" ? -4 : 4, scale: 0.9 }
      }
      whileInView={{ opacity: 1, x: bleed, y: 0, rotate: 0, scale: 1 }}
      viewport={{ once: false, margin: "-100px" }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200 }}
      className={`pointer-events-none ${visibilityClass} ${wrapperBase} ${width} ${height} ${className}`}
      suppressHydrationWarning
    >
      {/* glow halo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 blur-2xl"
        style={{ background: GLOW[glow] }}
      />
      {/* breathing float — pure CSS so it can't lag */}
      <div
        className={`scroll-image-float h-full w-full ${reduce ? "" : "is-animated"}`}
        data-side={side}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
          style={{
            filter:
              "drop-shadow(0 30px 50px rgba(0,0,0,0.55)) drop-shadow(0 0 30px rgba(167,139,250,0.25))",
            transform: tilt ? `rotateY(${tilt * 0.5}deg)` : undefined,
          }}
        />
      </div>
      <style jsx>{`
        .scroll-image-float.is-animated {
          animation: scroll-image-breathe 9s ease-in-out infinite;
          will-change: transform;
        }
        .scroll-image-float[data-side="right"].is-animated {
          animation-name: scroll-image-breathe-right;
        }
        @keyframes scroll-image-breathe {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(1.2deg);
          }
        }
        @keyframes scroll-image-breathe-right {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(-1.2deg);
          }
        }
      `}</style>
    </motion.div>
  );
}
