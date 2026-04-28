"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  className?: string;
  /** Number of subtle drifting dust specks (CSS-only, low cost). */
  dustCount?: number;
};

/**
 * Page-scoped cosmic pulse layer.
 *
 *  – Slowly color-cycling deep-space gradient (no bubbles).
 *  – Pulses (breathes) at a calm pace; scroll velocity briefly speeds
 *    the pulse up just for that scroll moment.
 *  – Optional non-intrusive abstract dust particles drifting in z-space.
 *  – Stays well behind text so readability is never compromised.
 *
 * SSR-safe: deterministic positions, all motion happens in CSS keyframes
 * so framer-motion only watches one scroll progress (cheap).
 */
export default function CosmicBackground({
  className = "",
  dustCount = 36,
}: Props) {
  const reduce = useReducedMotion();
  const [boost, setBoost] = useState(false);
  const { scrollY } = useScroll();
  const lastY = useRef(0);
  const lastT = useRef(0);
  const boostTimer = useRef<number | null>(null);

  // Track scroll velocity → flip a "boost" flag for ~700ms when the
  // user scrolls quickly. The flag toggles a faster CSS pulse.
  useMotionValueEvent(scrollY, "change", (v) => {
    if (reduce) return;
    const now = performance.now();
    const dt = now - lastT.current;
    lastT.current = now;
    if (dt <= 0) return;
    const velocity = Math.abs(v - lastY.current) / dt; // px / ms
    lastY.current = v;
    if (velocity > 0.6) {
      setBoost(true);
      if (boostTimer.current) window.clearTimeout(boostTimer.current);
      boostTimer.current = window.setTimeout(() => setBoost(false), 750);
    }
  });

  useEffect(
    () => () => {
      if (boostTimer.current) window.clearTimeout(boostTimer.current);
    },
    [],
  );

  // Deterministic dust positions (SSR-safe).
  const dust = useMemo(() => {
    return Array.from({ length: dustCount }, (_, i) => {
      const s = (i + 1) * 9301 + 49297;
      const r1 = (s % 233280) / 233280;
      const r2 = ((s * 7) % 233280) / 233280;
      const r3 = ((s * 13) % 233280) / 233280;
      const r4 = ((s * 19) % 233280) / 233280;
      return {
        left: `${(r1 * 100).toFixed(3)}%`,
        top: `${(r2 * 100).toFixed(3)}%`,
        size: 1.4 + r3 * 2.8,
        opacity: 0.35 + r3 * 0.5,
        dur: 14 + r4 * 22,
        delay: -r1 * 18,
        driftX: (r2 - 0.5) * 60,
        driftY: -(20 + r3 * 60),
        hue: r4 < 0.5 ? "rgba(167,139,250,0.85)" : "rgba(103,232,249,0.85)",
      };
    });
  }, [dustCount]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
      data-testid="cosmic-background"
      data-boost={boost ? "1" : "0"}
    >
      {/* Layer 1 — color-cycling cosmic gradient base */}
      <div
        className={`absolute inset-0 cosmic-base ${reduce ? "" : "is-animated"} ${boost ? "is-boost" : ""}`}
      />
      {/* Layer 2 — slow pulsating halo */}
      <div
        className={`absolute inset-0 cosmic-pulse ${reduce ? "" : "is-animated"} ${boost ? "is-boost" : ""}`}
      />
      {/* Layer 3 — abstract drifting dust */}
      <div className="absolute inset-0">
        {dust.map((d, i) => (
          <span
            key={i}
            className={`cosmic-dust absolute rounded-full ${reduce ? "" : "is-animated"}`}
            style={{
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size,
              opacity: d.opacity,
              background: d.hue,
              boxShadow: `0 0 ${d.size * 4}px ${d.hue}`,
              ["--drift-x" as never]: `${d.driftX}px`,
              ["--drift-y" as never]: `${d.driftY}px`,
              ["--dust-dur" as never]: `${d.dur}s`,
              ["--dust-delay" as never]: `${d.delay}s`,
            }}
          />
        ))}
      </div>
      {/* Layer 4 — soft grain for depth */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.7) 0 1px, transparent 1px 3px)",
        }}
      />

      <style jsx>{`
        .cosmic-base {
          background:
            radial-gradient(ellipse at 50% -10%, rgba(76, 29, 149, 0.55) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 110%, rgba(34, 211, 238, 0.22) 0%, transparent 50%),
            linear-gradient(180deg, #04030f 0%, #0a0820 45%, #04040d 100%);
          background-size: 100% 100%, 100% 100%, 100% 100%;
          will-change: filter;
        }
        .cosmic-base.is-animated {
          animation: cosmic-hue 38s ease-in-out infinite;
        }
        .cosmic-base.is-boost {
          animation-duration: 8s;
        }

        .cosmic-pulse {
          background:
            radial-gradient(circle at 30% 30%, rgba(167, 139, 250, 0.22), transparent 55%),
            radial-gradient(circle at 75% 70%, rgba(34, 211, 238, 0.18), transparent 55%),
            radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.12), transparent 65%);
          mix-blend-mode: screen;
        }
        .cosmic-pulse.is-animated {
          animation: cosmic-breathe 14s ease-in-out infinite;
        }
        .cosmic-pulse.is-boost {
          animation-duration: 3.4s;
        }

        @keyframes cosmic-hue {
          0% {
            filter: hue-rotate(0deg) saturate(1);
          }
          25% {
            filter: hue-rotate(20deg) saturate(1.1);
          }
          50% {
            filter: hue-rotate(-22deg) saturate(1.15);
          }
          75% {
            filter: hue-rotate(14deg) saturate(1.05);
          }
          100% {
            filter: hue-rotate(0deg) saturate(1);
          }
        }
        @keyframes cosmic-breathe {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.03);
          }
        }

        .cosmic-dust {
          transform: translate3d(0, 0, 0);
          will-change: transform, opacity;
        }
        .cosmic-dust.is-animated {
          animation: cosmic-drift var(--dust-dur, 18s) ease-in-out var(--dust-delay, 0s) infinite;
        }
        @keyframes cosmic-drift {
          0% {
            transform: translate3d(0, 0, 0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift-x, 0), var(--drift-y, -50px), 0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
