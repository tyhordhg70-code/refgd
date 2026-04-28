"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * VaultScene — a scroll-driven vault door that opens to reveal a glow
 * of digital "freedom" inside. Pure SVG + framer-motion (no three.js)
 * so it stays lightweight, accessible and indexable.
 *
 *  Phase 0  0.0 → 0.25  • door fully closed, dial idle
 *  Phase 1  0.25 → 0.55 • dial spins, locks pull back
 *  Phase 2  0.55 → 1.0  • door swings open, inner glow blooms,
 *                         coins / rays emit
 */
export default function VaultScene({
  className = "",
  height = "h-[520px] sm:h-[640px] lg:h-[720px]",
}: {
  className?: string;
  height?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const dialRot = useTransform(scrollYProgress, [0, 0.55], reduce ? [0, 0] : [0, 720]);
  const doorOpen = useTransform(scrollYProgress, [0.55, 1], reduce ? [0, 0] : [0, -110]);
  const innerGlow = useTransform(scrollYProgress, [0.4, 1], [0, 1]);
  const innerScale = useTransform(scrollYProgress, [0.5, 1], [0.6, 1.15]);
  const lockShift = useTransform(scrollYProgress, [0.25, 0.55], reduce ? [0, 0] : [0, 18]);
  const lockShiftN = useTransform(scrollYProgress, [0.25, 0.55], reduce ? [0, 0] : [0, -18]);

  return (
    <div
      ref={ref}
      className={`relative w-full ${height} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 800 800"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="vault-inner" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
            <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#7c3aed" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0b0a18" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="vault-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3f55" />
            <stop offset="50%" stopColor="#1d2032" />
            <stop offset="100%" stopColor="#0c0e1c" />
          </linearGradient>
          <linearGradient id="vault-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#525a78" />
            <stop offset="100%" stopColor="#1a1d2e" />
          </linearGradient>
          <radialGradient id="dial-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5a6280" />
            <stop offset="65%" stopColor="#22273a" />
            <stop offset="100%" stopColor="#0d0f1c" />
          </radialGradient>
          <filter id="vault-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Vault chamber back */}
        <rect x="0" y="0" width="800" height="800" fill="#06070d" />
        {/* Tiled metal panels */}
        <g opacity="0.55">
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => (
              <rect
                key={`${r}-${c}`}
                x={c * 100}
                y={r * 100}
                width={98}
                height={98}
                fill="url(#vault-metal)"
                stroke="#0b0d18"
                strokeWidth="2"
                rx="6"
              />
            )),
          )}
        </g>

        {/* Inner light bloom (revealed when door opens) */}
        <motion.g style={{ opacity: innerGlow, scale: innerScale, transformOrigin: "400px 400px" }}>
          <circle cx="400" cy="400" r="280" fill="url(#vault-inner)" />
          <circle cx="400" cy="400" r="280" fill="url(#vault-inner)" filter="url(#vault-soft)" />
          {/* Light rays */}
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const x2 = 400 + Math.cos(a) * 360;
            const y2 = 400 + Math.sin(a) * 360;
            return (
              <line
                key={i}
                x1={400}
                y1={400}
                x2={x2}
                y2={y2}
                stroke="#fcd34d"
                strokeOpacity="0.18"
                strokeWidth="2"
              />
            );
          })}
        </motion.g>

        {/* Outer rim of the vault opening */}
        <circle cx="400" cy="400" r="290" fill="url(#vault-rim)" />
        <circle cx="400" cy="400" r="278" fill="#06070d" />

        {/* Bolts around the rim */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x = 400 + Math.cos(a) * 296;
          const y = 400 + Math.sin(a) * 296;
          return (
            <circle key={i} cx={x} cy={y} r="6" fill="#525a78" stroke="#0d0f1c" strokeWidth="1.5" />
          );
        })}

        {/* The door — pivots on its left edge to swing open */}
        <motion.g
          style={{
            rotateY: doorOpen,
            transformOrigin: "122px 400px",
            transformBox: "fill-box",
          } as Record<string, unknown>}
        >
          {/* Door slab */}
          <circle cx="400" cy="400" r="270" fill="url(#vault-metal)" />
          <circle cx="400" cy="400" r="270" fill="none" stroke="#0a0c18" strokeWidth="3" />
          <circle cx="400" cy="400" r="240" fill="none" stroke="#3a3f55" strokeWidth="2" opacity="0.6" />
          <circle cx="400" cy="400" r="200" fill="none" stroke="#3a3f55" strokeWidth="1.5" opacity="0.4" />

          {/* Locking bars (shift outward as the dial spins) */}
          <motion.rect
            x="395" y="160" width="10" height="60" fill="#525a78" rx="2"
            style={{ y: lockShiftN } as Record<string, unknown>}
          />
          <motion.rect
            x="395" y="580" width="10" height="60" fill="#525a78" rx="2"
            style={{ y: lockShift } as Record<string, unknown>}
          />
          <motion.rect
            x="160" y="395" width="60" height="10" fill="#525a78" rx="2"
            style={{ x: lockShiftN } as Record<string, unknown>}
          />
          <motion.rect
            x="580" y="395" width="60" height="10" fill="#525a78" rx="2"
            style={{ x: lockShift } as Record<string, unknown>}
          />

          {/* Central dial */}
          <motion.g style={{ rotate: dialRot, transformOrigin: "400px 400px" } as Record<string, unknown>}>
            <circle cx="400" cy="400" r="120" fill="url(#dial-grad)" stroke="#0b0d18" strokeWidth="3" />
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              const x1 = 400 + Math.cos(a) * 100;
              const y1 = 400 + Math.sin(a) * 100;
              const x2 = 400 + Math.cos(a) * 116;
              const y2 = 400 + Math.sin(a) * 116;
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={i % 6 === 0 ? 3 : 1.2} opacity={i % 6 === 0 ? 1 : 0.7} />
              );
            })}
            <circle cx="400" cy="400" r="40" fill="#0d0f1c" stroke="#525a78" strokeWidth="2" />
            {/* Dial handle */}
            <rect x="396" y="300" width="8" height="60" fill="#fbbf24" rx="2" />
            <circle cx="400" cy="296" r="10" fill="#fbbf24" stroke="#7c3aed" strokeWidth="2" />
          </motion.g>

          {/* Side handle */}
          <g transform="translate(640 380)">
            <rect x="0" y="0" width="50" height="40" rx="6" fill="#525a78" stroke="#0b0d18" strokeWidth="2" />
            <rect x="10" y="10" width="30" height="20" rx="3" fill="#1d2032" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}
