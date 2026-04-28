"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * AnimatedDivider
 * ─────────────────────────────────────────────────────────────────
 * Decorative animated divider that lives between two chapters. A
 * cluster of floating shopping icons drifts across the band in a
 * soft horizontal current — coins, bags, and sparkles — with a
 * subtle amber wash beneath. Replaces a previously-static decorative
 * background image so the visitor sees life between sections.
 */
const ICONS = [
  // Shopping bag
  "M6 7h12l-1.2 12.3a2 2 0 0 1-2 1.7H9.2a2 2 0 0 1-2-1.7L6 7zM9 7V5a3 3 0 0 1 6 0v2",
  // Coin (circle)
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H10a2 2 0 0 0 0 4h5",
  // Sparkle
  "M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4",
  // Tag
  "M20.6 12.6 12 21.2 2.8 12V2.8H12L20.6 11.4a1 1 0 0 1 0 1.2zM7.5 7.5h.01",
  // Gift box
  "M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
];

export default function AnimatedDivider() {
  const reduce = useReducedMotion();
  // Render a row of 12 floaters across the band, each given a unique
  // horizontal start, vertical bob phase, and icon glyph.
  const items = Array.from({ length: 12 }, (_, i) => ({
    icon: ICONS[i % ICONS.length],
    leftPct: 5 + i * 8,
    delay: (i % 6) * 0.4,
    size: 28 + (i % 4) * 10,
    // Tints alternate between amber, violet and cyan for richness.
    color: ["#f5b945", "#a78bfa", "#22d3ee", "#f5b945"][i % 4],
  }));

  return (
    <section
      aria-hidden="true"
      className="relative isolate w-full overflow-hidden"
      style={{
        height: "clamp(180px, 22vh, 280px)",
        background:
          "radial-gradient(ellipse at center, rgba(245,185,69,0.18) 0%, rgba(15,10,30,0) 70%), linear-gradient(90deg, rgba(8,6,18,0) 0%, rgba(15,10,30,0.5) 50%, rgba(8,6,18,0) 100%)",
      }}
    >
      {/* Top + bottom hairline glows */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent" />

      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={
            reduce
              ? undefined
              : {
                  y: [0, -22, 0, 16, 0],
                  rotate: [0, 8, -6, 4, 0],
                  opacity: [0.55, 0.95, 0.7, 0.95, 0.55],
                }
          }
          transition={{
            duration: 6 + (i % 5),
            repeat: Infinity,
            delay: it.delay,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: `${it.leftPct}%`,
            width: it.size,
            height: it.size,
            color: it.color,
            filter: `drop-shadow(0 0 12px ${it.color}aa)`,
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
