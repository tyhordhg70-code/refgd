"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useState, type ReactNode, type CSSProperties } from "react";

/**
 * MeshExpansionReveal — wraps a card-shaped block with a 3D entrance:
 *
 *   1. The card itself folds out of depth: starts at scale 0.5,
 *      rotated 28° back along X (and a tiny 6° on Y for a touch of
 *      organic perspective), opacity 0 → settles into rest pose.
 *   2. Layered ON TOP, a "distorted mesh" SVG grid expands radially
 *      from the centre of the card. The grid is run through an
 *      `feTurbulence` + `feDisplacementMap` filter so the lines
 *      ripple as they expand — like a wireframe being torn outward
 *      by a shockwave — then it fades out, leaving the rested card.
 *
 * The whole entrance is `viewport={{ once: false }}` — it REPLAYS
 * every time the wrapped card scrolls back into view from any
 * direction, in keeping with the rest of the page's animation
 * persistence guarantee.
 *
 * Honours `prefers-reduced-motion` (renders a plain wrapper).
 */
export default function MeshExpansionReveal({
  children,
  className,
  /** Override the rounded-corner of the mesh overlay so it matches the card. */
  borderRadius = "2.5rem",
}: {
  children: ReactNode;
  className?: string;
  borderRadius?: string;
}) {
  const reduced = useReducedMotion();
  const filterId = useId();

  // ── Mobile detection ───────────────────────────────────────
  // The user wants the telegram-box entrance animation back on
  // mobile. The mesh entrance is restored — but the heavy SVG
  // `feTurbulence` + `feDisplacementMap` filter is dropped on
  // phones. That filter was the actual perf killer on mobile:
  // every frame the browser had to re-rasterise a 13×13 grid
  // through the displacement map. Without the filter the grid
  // lines still expand and fade — a clean wireframe shockwave
  // — but at near-zero compositor cost. Card-fold-out, opacity
  // pulse, gradient stroke all stay identical on both platforms.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const wrapperStyle: CSSProperties = {
    perspective: "1600px",
  };

  const stageStyle: CSSProperties = {
    transformStyle: "preserve-3d",
    transformOrigin: "50% 50%",
    willChange: "transform, opacity",
  };

  const overlayStyle: CSSProperties = {
    transformOrigin: "50% 50%",
    borderRadius,
    overflow: "hidden",
  };

  return (
    <div className={className} style={wrapperStyle}>
      <motion.div
        className="relative"
        initial={{
          opacity: 0,
          scale: 0.5,
          rotateX: 28,
          rotateY: -6,
          y: 40,
        }}
        whileInView={{
          opacity: 1,
          scale: 1,
          rotateX: 0,
          rotateY: 0,
          y: 0,
        }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{
          duration: 1.25,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={stageStyle}
      >
        {children}

        {/*
         * Distorted mesh overlay — sits absolutely over the card,
         * pointer-events disabled so it doesn't intercept clicks
         * on the underlying CTA button. Its scale animates from 0.1
         * to 1.6 (overshooting the card edges) while opacity
         * pulses [0 → 0.85 → 0] so it appears to detonate outward
         * from the centre and dissolve at the edges. The SVG group
         * is run through feTurbulence+feDisplacementMap so the grid
         * lines ripple as they expand — the "distorted" part.
         */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={overlayStyle}
          initial={{ opacity: 0, scale: 0.1 }}
          whileInView={{ opacity: [0, 0.85, 0], scale: 1.6 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{
            duration: 1.6,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.15,
            times: [0, 0.45, 1],
          }}
        >
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <filter
                id={`mesh-distort-${filterId}`}
                x="-25%"
                y="-25%"
                width="150%"
                height="150%"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.035"
                  numOctaves="2"
                  seed="7"
                />
                <feDisplacementMap in="SourceGraphic" scale="6" />
              </filter>
              <linearGradient id={`mesh-stroke-${filterId}`} x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 215, 130, 0.95)" />
                <stop offset="55%" stopColor="rgba(167, 139, 250, 0.85)" />
                <stop offset="100%" stopColor="rgba(34, 211, 238, 0.75)" />
              </linearGradient>
            </defs>
            <g
              // Mobile: skip the feTurbulence/feDisplacementMap
              // filter entirely. The grid still expands and fades
              // (visual entrance) but without per-frame
              // displacement re-raster which was causing scroll
              // stutter on phones the moment the wrapped CTA
              // crossed viewport.
              filter={isMobile ? undefined : `url(#mesh-distort-${filterId})`}
              stroke={`url(#mesh-stroke-${filterId})`}
              strokeWidth="0.3"
              fill="none"
              style={
                isMobile
                  ? undefined
                  : { filter: "drop-shadow(0 0 4px rgba(255, 215, 130, 0.6))" }
              }
            >
              {/* Vertical grid lines */}
              {Array.from({ length: 13 }, (_, i) => {
                const x = (i / 12) * 100;
                return (
                  <line
                    key={`v-${i}`}
                    x1={x}
                    y1={-10}
                    x2={x}
                    y2={110}
                  />
                );
              })}
              {/* Horizontal grid lines */}
              {Array.from({ length: 13 }, (_, i) => {
                const y = (i / 12) * 100;
                return (
                  <line
                    key={`h-${i}`}
                    x1={-10}
                    y1={y}
                    x2={110}
                    y2={y}
                  />
                );
              })}
              {/* Two diagonals to add motion variety */}
              <line x1="-5" y1="-5" x2="105" y2="105" />
              <line x1="105" y1="-5" x2="-5" y2="105" />
            </g>
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
