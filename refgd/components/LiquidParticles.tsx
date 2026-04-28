"use client";

import { useMemo } from "react";

type Props = {
  /** Number of liquid abstract particles to render. */
  count?: number;
  className?: string;
};

/**
 * Floating abstract liquid-glass particles. Pure-CSS keyframes (one
 * cheap animation per particle), no scroll listeners, no per-frame JS.
 * Deterministic positions for SSR safety.
 *
 *  – Soft blurred orbs that drift slowly upward and across.
 *  – `screen` blend so they glow on top of the cosmic gradient.
 *  – Non-intrusive: low opacity, sit behind text content.
 */
export default function LiquidParticles({ count = 14, className = "" }: Props) {
  const PAL = useMemo(
    () => [
      "rgba(167,139,250,0.55)", // violet
      "rgba(103,232,249,0.50)", // cyan
      "rgba(236,72,153,0.40)", // pink
      "rgba(99,102,241,0.50)", // indigo
      "rgba(34,211,238,0.48)", // sky
    ],
    [],
  );

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const s = (i + 1) * 9301 + 49297;
      const r1 = (s % 233280) / 233280;
      const r2 = ((s * 7) % 233280) / 233280;
      const r3 = ((s * 13) % 233280) / 233280;
      const r4 = ((s * 19) % 233280) / 233280;
      const r5 = ((s * 31) % 233280) / 233280;
      return {
        left: `${(r1 * 100).toFixed(3)}%`,
        top: `${(r2 * 100).toFixed(3)}%`,
        size: 90 + r3 * 240,
        color: PAL[Math.floor(r5 * PAL.length)],
        dur: 22 + r3 * 24,
        delay: -r1 * 18,
        driftX: (r2 - 0.5) * 200,
        driftY: -(80 + r3 * 280),
      };
    });
  }, [count, PAL]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-[5] overflow-hidden ${className}`}
      data-testid="liquid-particles"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="liquid-particle absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: `radial-gradient(closest-side, ${p.color}, transparent 75%)`,
            filter: "blur(28px)",
            mixBlendMode: "screen",
            ["--drift-x" as never]: `${p.driftX}px`,
            ["--drift-y" as never]: `${p.driftY}px`,
            ["--p-dur" as never]: `${p.dur}s`,
            ["--p-delay" as never]: `${p.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        .liquid-particle {
          transform: translate3d(0, 0, 0);
          will-change: transform, opacity;
          animation: liquid-drift var(--p-dur, 24s) ease-in-out var(--p-delay, 0s) infinite;
        }
        @keyframes liquid-drift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate3d(calc(var(--drift-x) * 0.6), calc(var(--drift-y) * 0.5), 0)
              scale(1.06);
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift-x), var(--drift-y), 0) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
