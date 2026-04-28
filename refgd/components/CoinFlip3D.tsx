"use client";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

/**
 * CoinFlip3D — pure CSS 3D coin (heads / tails) that flips on hover
 * and on initial scroll-in. Uses the platform's native preserve-3d.
 *
 * The face & rim are painted with conic + radial gradients so no
 * external image is needed.
 */
export default function CoinFlip3D({
  size = 220,
  faceLabel = "REFUND",
  backLabel = "GOD",
  accent = "#f5b945",
  className = "",
}: {
  size?: number;
  faceLabel?: string;
  backLabel?: string;
  accent?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: false, margin: "-15% 0px" });

  const ringStyle = {
    background: `conic-gradient(from 0deg, ${accent} 0%, #2a2417 18%, ${accent} 38%, #2a2417 58%, ${accent} 78%, #2a2417 95%, ${accent} 100%)`,
  };

  return (
    <div
      ref={ref}
      className={`coin-flip-wrap group relative grid place-items-center ${className}`}
      style={{ width: size, height: size, ["--coin-size" as string]: `${size}px` }}
    >
      <motion.div
        className="coin-flip-3d"
        style={{ width: size, height: size }}
        animate={
          reduce
            ? { rotateY: 0 }
            : inView
              ? { rotateY: [0, 180, 360, 540, 720] }
              : { rotateY: 0 }
        }
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 4.6, ease: [0.22, 1, 0.36, 1], repeat: Infinity, repeatDelay: 1.4 }
        }
      >
        {/* Face */}
        <div className="coin-face" style={ringStyle}>
          <div className="coin-face-inner">
            <span className="coin-label" style={{ color: accent }}>
              {faceLabel}
            </span>
            <span className="coin-sub">★ EST 2019 ★</span>
          </div>
        </div>
        {/* Back */}
        <div className="coin-face coin-back" style={ringStyle}>
          <div className="coin-face-inner">
            <span className="coin-label" style={{ color: accent }}>
              {backLabel}
            </span>
            <span className="coin-sub">— PAID IN FULL —</span>
          </div>
        </div>
        {/* Edge */}
        <div
          className="coin-edge"
          style={{
            background: `repeating-linear-gradient(90deg, ${accent} 0, ${accent} 2px, #1a1408 2px, #1a1408 4px)`,
          }}
        />
      </motion.div>
      {/* Glow under the coin */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle at center, ${accent}33, transparent 60%)`,
        }}
      />
    </div>
  );
}
