"use client";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

/**
 * DeSo-style editorial manifesto block: oversized words pinned to the
 * viewport while the user scrolls, with each word lighting up in
 * sequence. Magazine-style cinematic typography.
 *
 * v37 — opacity floor raised so words never dip below 0.92.
 * Previously the per-line opacity ramp went 0.18 → 1 → 1 → 0.35,
 * meaning every word visibly DIMMED to 35% as scroll passed it. On
 * backscroll the same dimming re-applied, which contributed to the
 * "text vanishes on rescroll" perception. Now the ramp is
 * 0.92 → 1 → 1 → 0.96 — words still pulse subtly into prominence
 * for their slot (cinematic effect preserved) but never fade away.
 */
export default function Manifesto({
  words,
  caption,
}: {
  words: string[];
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <section
      ref={ref}
      style={{ height: `${Math.max(2, words.length * 0.6)}00vh` }}
      className="relative"
    >
      <div className="sticky top-0 grid h-[100svh] place-items-center overflow-hidden">
        <div className="container-wide text-center">
          {caption && (
            <p className="heading-display mb-10 text-xs font-semibold uppercase tracking-[0.5em] text-white/45 sm:text-sm">
              {caption}
            </p>
          )}
          <div className="editorial-display mx-auto max-w-6xl text-balance text-5xl uppercase sm:text-7xl md:text-[8rem] lg:text-[10rem]">
            {words.map((w, i) => (
              <ManifestoLine
                key={`${w}-${i}`}
                word={w}
                index={i}
                total={words.length}
                progress={scrollYProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ManifestoLine({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  // v37: opacity floor raised from 0.18/0.35 to 0.92/0.96 so words
  // pulse into prominence for their slot but never visibly vanish.
  const opacity = useTransform(
    progress,
    [Math.max(0, start - 0.05), start + 0.04, end - 0.04, Math.min(1, end + 0.1)],
    [0.92, 1, 1, 0.96],
  );
  const y = useTransform(
    progress,
    [Math.max(0, start - 0.04), start + 0.06],
    ["18%", "0%"],
  );
  return (
    <motion.span
      className="block bg-gradient-to-b from-white via-white to-amber-200 bg-clip-text text-transparent"
      style={{ opacity, y }}
      suppressHydrationWarning
    >
      {word}
    </motion.span>
  );
}
