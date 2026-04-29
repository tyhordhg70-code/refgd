"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * TrailerTitle3D — high-impact 3D animated title that sits ABOVE the
 * trailer player. Replaces the old plain-text "view trailer ·
 * auto-plays on scroll" eyebrow with a per-letter perspective sweep:
 * each glyph rotates in on its own axis, settles, then a slow
 * cyan glow loops underneath the line.
 *
 * The 3D feel comes from `perspective` on the container plus
 * per-letter `rotateY` + `rotateX` + `z` translation on the spans.
 */
export default function TrailerTitle3D({
  text = "VIEW TRAILER VIDEO",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const letters = Array.from(text);

  return (
    <motion.div
      className={`relative mb-6 flex flex-col items-center justify-center text-center ${className}`}
      style={{ perspective: 900 }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      data-testid="trailer-title-3d"
    >
      {/* Subtle glow halo behind the letters — pulses on a slow loop
          so the title feels alive even after the entrance plays. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-32 -translate-y-1/2 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(34,211,238,0.55), transparent 70%)",
        }}
        animate={
          reduce
            ? { opacity: 0.6 }
            : { opacity: [0.35, 0.7, 0.35] }
        }
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <h2
        className="editorial-display flex flex-wrap items-center justify-center gap-y-1 text-white text-[clamp(1.6rem,5vw,3.6rem)] uppercase"
        style={{
          fontWeight: 900,
          letterSpacing: "0.04em",
          WebkitTextStroke: "1px rgba(34,211,238,0.45)",
          textShadow:
            "0 4px 24px rgba(0,0,0,0.85), 0 0 40px rgba(34,211,238,0.35), 0 2px 6px rgba(0,0,0,0.95)",
          transformStyle: "preserve-3d",
        }}
      >
        {letters.map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            className="inline-block"
            style={{
              transformOrigin: "50% 50% -10px",
              willChange: "transform, opacity",
              // Non-breaking space so spaces still take width.
              whiteSpace: ch === " " ? "pre" : undefined,
            }}
            variants={{
              hidden: reduce
                ? { opacity: 1 }
                : {
                    opacity: 0,
                    rotateY: -90,
                    rotateX: 28,
                    z: -180,
                    y: 20,
                  },
              show: reduce
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    rotateY: 0,
                    rotateX: 0,
                    z: 0,
                    y: 0,
                    transition: {
                      duration: 0.85,
                      delay: i * 0.045,
                      ease: [0.22, 1.4, 0.36, 1],
                    },
                  },
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        ))}
      </h2>

      {/* Thin animated underline that scans left → right after the
          letters land, accenting the title with a video-marquee feel. */}
      <motion.span
        aria-hidden
        className="mt-3 block h-[2px] w-32 origin-left"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(34,211,238,0.95), transparent)",
        }}
        initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.div>
  );
}
