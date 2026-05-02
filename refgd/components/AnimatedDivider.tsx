"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * AnimatedDivider
 * ─────────────────────────────────────────────────────────────────
 * A visible chapter break between two editorial chapters. Earlier
 * iterations of this component were too transparent and read as a
 * blank band, so users complained the page looked "blank" after the
 * preceding section. This rewrite gives the divider a hard visual
 * identity:
 *
 *   • A marquee-style scrolling rule with a repeating editorial
 *     phrase ("· refundgod · since 2019 · trusted ·") so the band
 *     ALWAYS has visible content even before icons resolve.
 *   • Two glowing hairlines (top + bottom) with denser highlight in
 *     the centre of the band.
 *   • A cluster of softly-bobbing shopping-themed icons drifting
 *     above and below the marquee rule.
 *   • Heavy radial vignette so the band feels intentional instead of
 *     accidentally empty.
 *
 * Height is intentionally compressed (was 22vh → now ~140px) so we
 * don't lose vertical real estate between chapters.
 */
const ICONS = [
  "M6 7h12l-1.2 12.3a2 2 0 0 1-2 1.7H9.2a2 2 0 0 1-2-1.7L6 7zM9 7V5a3 3 0 0 1 6 0v2",
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H10a2 2 0 0 0 0 4h5",
  "M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4",
  "M20.6 12.6 12 21.2 2.8 12V2.8H12L20.6 11.4a1 1 0 0 1 0 1.2zM7.5 7.5h.01",
  "M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
];

const MARQUEE = " · REFUNDGOD · SINCE 2019 · TRUSTED · CASHBACK · 480+ STORES · STEALTH · ";

export default function AnimatedDivider() {
  const reduce = useReducedMotion();

  // 16 floaters (8 above the rule, 8 below) so the band feels
  // populated edge-to-edge. Stagger sizes / hues / phases.
  const items = Array.from({ length: 16 }, (_, i) => ({
    icon: ICONS[i % ICONS.length],
    leftPct: 4 + i * 6,
    delay: (i % 6) * 0.4,
    size: 22 + (i % 3) * 8,
    color: ["#f5b945", "#a78bfa", "#22d3ee", "#fb7185"][i % 4],
    above: i % 2 === 0,
  }));

  return (
    <section
      aria-hidden="true"
      className="relative isolate w-full overflow-hidden"
      style={{
        height: "clamp(120px, 14vh, 160px)",
        background:
          "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(245,185,69,0.22) 0%, rgba(167,139,250,0.10) 40%, rgba(15,10,30,0) 75%), linear-gradient(90deg, rgba(8,6,18,0.6) 0%, rgba(15,10,30,0.85) 50%, rgba(8,6,18,0.6) 100%)",
      }}
    >
      {/* Glowing hairlines — top + bottom + a stronger centre rule */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(245,185,69,0.85) 50%, transparent 100%)",
          boxShadow: "0 0 20px rgba(245,185,69,0.5)",
        }}
      />

      {/* Marquee rule — always-visible editorial heartbeat that
          guarantees the band reads as intentional content. */}
      <div
        className="absolute left-1/2 top-1/2 w-[150%] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
        style={{ height: "32px" }}
      >
        <motion.div
          className="heading-display whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.45em] text-amber-200/90"
          initial={false}
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          style={{
            textShadow: "0 0 14px rgba(245,185,69,0.55)",
            willChange: "transform",
          }}
        >
          {/* Repeat enough times to cover translate distance */}
          {MARQUEE.repeat(10)}
        </motion.div>
      </div>

      {/* Floating icon cluster — split above / below the rule. */}
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={
            reduce
              ? undefined
              : {
                  y: [0, -10, 0, 10, 0],
                  rotate: [0, 6, -4, 4, 0],
                  opacity: [0.45, 0.85, 0.6, 0.85, 0.45],
                }
          }
          transition={{
            duration: 5 + (i % 4),
            repeat: Infinity,
            delay: it.delay,
            ease: "easeInOut",
          }}
          className="absolute"
          style={{
            left: `${it.leftPct}%`,
            top: it.above ? "12%" : "auto",
            bottom: it.above ? "auto" : "12%",
            width: it.size,
            height: it.size,
            color: it.color,
            filter: `drop-shadow(0 0 10px ${it.color}cc)`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d={it.icon} />
          </svg>
        </motion.div>
      ))}
    </section>
  );
}
