"use client";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";

/**
 * Vector chapter illustration. A scroll-driven inline SVG composition
 * that morphs between a soft state and a "active" state as the section
 * enters/exits the viewport. Variants:
 *   - "store"      shopping bag + sparks
 *   - "shield"     hex shield + check
 *   - "chess"      king crown
 *   - "spark"      diamond burst
 *   - "encryption" interlocking rings
 *   - "globe"      orbital globe
 */

export type IllustrationKind =
  | "store" | "shield" | "chess" | "spark" | "encryption" | "globe";

const ACCENTS: Record<string, string> = {
  amber: "#ffd06b", violet: "#b196ff", cyan: "#7be7ff",
  fuchsia: "#ff8ed1", emerald: "#7eecc1", rose: "#ff8aa1", gold: "#ffe28a",
};

export default function ParallaxIllustration({
  kind,
  accent = "amber",
  className = "",
  size = 280,
}: {
  kind: IllustrationKind;
  accent?: keyof typeof ACCENTS;
  className?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [60, -60]);
  const rot = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-12, 12]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [1, 1, 1] : [0.85, 1.05, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0.6]);

  const c = ACCENTS[accent] ?? ACCENTS.amber;

  return (
    <motion.div
      ref={ref}
      style={{ y, rotate: rot, scale, opacity, position: "relative" }}
      suppressHydrationWarning
      className={`pointer-events-none ${className}`}
    >
      <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id={`pg-${kind}-${accent}`} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={c} stopOpacity="0.95" />
            <stop offset="55%" stopColor={c} stopOpacity="0.4" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`pg-${kind}-${accent}-line`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor={c} stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="120" r="110" fill={`url(#pg-${kind}-${accent})`} opacity="0.35" />
        {kind === "store" && (
          <g stroke={`url(#pg-${kind}-${accent}-line)`} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d="M70 95h100l-9 90H79z" />
            <path d="M95 95v-12a25 25 0 0 1 50 0v12" />
            <circle cx="120" cy="55" r="3" fill={c} />
            <path d="M55 70l8 4-8 4" />
            <path d="M185 70l-8 4 8 4" />
            <path d="M110 130l8 8 14-16" />
          </g>
        )}
        {kind === "shield" && (
          <g stroke={`url(#pg-${kind}-${accent}-line)`} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d="M120 40l60 20v50c0 40-30 70-60 90-30-20-60-50-60-90V60z" fill={c} fillOpacity="0.08" />
            <path d="M95 122l18 18 32-40" />
            <path d="M75 70l-10 4 10 4M165 70l10 4-10 4" />
          </g>
        )}
        {kind === "chess" && (
          <g stroke={`url(#pg-${kind}-${accent}-line)`} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d="M95 65v-12M120 65v-15M145 65v-12M120 50v-12M114 38h12" />
            <path d="M88 65h64v15H88z" fill={c} fillOpacity="0.15" />
            <path d="M92 80c0 20 8 38 28 50 20-12 28-30 28-50" fill={c} fillOpacity="0.08" />
            <path d="M75 175h90l-8-30H83z" fill={c} fillOpacity="0.15" />
            <path d="M70 200h100" />
          </g>
        )}
        {kind === "spark" && (
          <g stroke={`url(#pg-${kind}-${accent}-line)`} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d="M120 50l16 50 50 20-50 20-16 50-16-50-50-20 50-20z" fill={c} fillOpacity="0.18" />
            <circle cx="120" cy="120" r="6" fill={c} />
            <path d="M40 60l12 4M188 60l-12 4M40 180l12-4M188 180l-12-4" />
          </g>
        )}
        {kind === "encryption" && (
          <g stroke={`url(#pg-${kind}-${accent}-line)`} strokeWidth="2.5" fill="none">
            <circle cx="95" cy="120" r="48" />
            <circle cx="145" cy="120" r="48" />
            <circle cx="120" cy="80" r="48" opacity="0.65" />
          </g>
        )}
        {kind === "globe" && (
          <g stroke={`url(#pg-${kind}-${accent}-line)`} strokeWidth="2.5" fill="none">
            <circle cx="120" cy="120" r="70" />
            <ellipse cx="120" cy="120" rx="70" ry="28" />
            <ellipse cx="120" cy="120" rx="28" ry="70" />
            <path d="M50 120h140M120 50v140" />
          </g>
        )}
      </svg>
    </motion.div>
  );
}
