"use client";

import { useEffect, useState } from "react";

type Props = {
  emotions: string[];
  className?: string;
  /** Period (ms) the neon glow takes to advance one box. */
  cyclePeriod?: number;
};

/**
 * Emotion chips with a wandering white-neon spotlight.
 *
 *  – All chips have a steady soft outline.
 *  – At any moment exactly ONE chip is "lit" — its border, glow and
 *    text brighten to a white-neon pulse, then fade as the spotlight
 *    moves to the next box.
 *  – Periodic, deterministic order. No jitter, no scroll listeners.
 */
export default function EmotionChips({
  emotions,
  className = "",
  cyclePeriod = 1500,
}: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % emotions.length);
    }, cyclePeriod);
    return () => window.clearInterval(id);
  }, [emotions.length, cyclePeriod]);

  return (
    <div
      className={`flex flex-wrap gap-2 pt-2 ${className}`}
      data-testid="emotion-chips"
    >
      {emotions.map((e, i) => {
        const lit = i === active;
        return (
          <span
            key={e}
            data-testid={`emotion-chip-${e.toLowerCase()}`}
            data-lit={lit ? "1" : "0"}
            className={`emotion-chip relative rounded-full border px-4 py-1.5 text-sm font-semibold backdrop-blur-sm transition-all duration-700 ease-out ${
              lit
                ? "border-white/90 bg-white/10 text-white"
                : "border-violet-400/40 bg-violet-400/10 text-violet-50"
            }`}
            style={
              lit
                ? {
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.6) inset, 0 0 18px rgba(255,255,255,0.55), 0 0 38px rgba(167,139,250,0.55), 0 0 70px rgba(103,232,249,0.4)",
                    textShadow:
                      "0 0 12px rgba(255,255,255,0.95), 0 0 22px rgba(255,255,255,0.55)",
                  }
                : undefined
            }
          >
            <span className="relative z-[1]">{e}</span>
            {lit ? (
              <span
                aria-hidden
                className="emotion-chip-pulse pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow:
                    "0 0 24px 4px rgba(255,255,255,0.45), 0 0 50px 8px rgba(167,139,250,0.55)",
                }}
              />
            ) : null}
          </span>
        );
      })}
      <style jsx>{`
        .emotion-chip-pulse {
          animation: emotion-chip-pulse 1.4s ease-in-out infinite;
        }
        @keyframes emotion-chip-pulse {
          0%,
          100% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.06);
          }
        }
      `}</style>
    </div>
  );
}
