"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

/**
 * LedJoySection
 * ─────────────────────────────────────────────────────────────────
 * Full-screen "digital LED text sign" beat that plays once when the
 * visitor scrolls into it. Two phases:
 *
 *   1) "AHHHH" — five letters fly in horizontally, fast paced, with
 *      a tiny stagger so it reads like a marquee scroll.
 *   2) "feel the joy of cashback" — words slide in from the right
 *      one-by-one in quick succession, again like a moving LED panel.
 *
 * Visual is amber dot-matrix LED on near-black, with subtle scanline
 * overlay and amber bloom for the lit-bulb feel. The section itself
 * is min-h-100svh so the LED sign is the ONLY thing on screen during
 * playback.
 */
export default function LedJoySection() {
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  // Margin pulls the trigger forward so the animation kicks the moment
  // the section starts scrolling into view rather than waiting for it
  // to be fully on screen.
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });

  const ahhLetters = "AHHHH".split("");
  const tagline = "feel the joy of cashback".split(" ");

  return (
    <section
      ref={ref}
      aria-label="Ahhh, feel the joy of cashback"
      /* User request: section was a full 100svh which left a lot of empty
         vertical space above and below the LED text. Reduced to 60svh
         so the beat plays tightly between the hero and Act 2 instead
         of forcing a near-full viewport scroll past empty room. Also
         dropped the heavy py default so the AHHHH sign sits higher
         in the viewport (visible immediately on entry). */
      /* v6.13.6 — items-center vertically centred the LED text in
         a 60svh box, leaving a chunk of empty galaxy ABOVE it. User
         asked for the text to sit higher, so we anchor to the top
         of the section and add a smaller top padding instead. */
      className="relative isolate flex min-h-[60svh] w-full items-start justify-center overflow-hidden pt-2 pb-12 sm:pt-4 sm:pb-16"
    >

      <div className="container-wide relative z-10 grid place-items-center text-center">
        {/* AHHHH — letters fly in horizontally fast */}
        <h2
          aria-hidden="true"
          className="led-display flex justify-center gap-1 text-amber-300 sm:gap-2"
          style={{
            fontFamily:
              '"Courier New", "Roboto Mono", ui-monospace, monospace',
            fontWeight: 900,
            letterSpacing: "0.05em",
            fontSize: "clamp(4.5rem, 22vw, 18rem)",
            lineHeight: 0.92,
            textShadow:
              "0 0 18px rgba(245,185,69,0.95), 0 0 48px rgba(245,185,69,0.6), 0 0 90px rgba(245,140,40,0.4)",
          }}
        >
          {ahhLetters.map((ch, i) => (
            <motion.span
              key={i}
              initial={reduce ? { opacity: 1 } : { opacity: 0, x: 360, skewX: -28 }}
              animate={inView ? { opacity: 1, x: 0, skewX: 0 } : undefined}
              transition={{
                duration: 0.32,
                delay: i * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block"
              suppressHydrationWarning
            >
              {ch}
            </motion.span>
          ))}
        </h2>
        {/* Visually-hidden equivalent for screen readers */}
        <span className="sr-only">Ahhh — feel the joy of cashback.</span>

        {/* feel the joy of cashback — word by word fast */}
        <p
          aria-hidden="true"
          className="led-display mt-6 flex flex-wrap justify-center gap-x-3 gap-y-1 text-amber-200 sm:gap-x-5 sm:mt-10"
          style={{
            fontFamily:
              '"Courier New", "Roboto Mono", ui-monospace, monospace',
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontSize: "clamp(1rem, 3.4vw, 2.6rem)",
            textShadow:
              "0 0 14px rgba(245,185,69,0.85), 0 0 32px rgba(245,140,40,0.5)",
          }}
        >
          {tagline.map((word, i) => (
            <motion.span
              key={i}
              initial={reduce ? { opacity: 1 } : { opacity: 0, x: 220 }}
              animate={inView ? { opacity: 1, x: 0 } : undefined}
              transition={{
                duration: 0.28,
                // Words start AFTER the AHHH letters finish. AHHH ends
                // around 0.07*4 + 0.32 = 0.6s.
                delay: 0.7 + i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block"
              suppressHydrationWarning
            >
              {word}
            </motion.span>
          ))}
        </p>
      </div>
    </section>
  );
}
