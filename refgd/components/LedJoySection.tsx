"use client";

import { motion, useReducedMotion } from "framer-motion";
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
  // v6.13.19 — REPLACED `useInView` + state-driven `animate={inView ? ... : undefined}`
  // with framer's `whileInView` API on each <motion.span> below.
  // Root cause of "ahh feel joy animation gone": the previous
  // `useInView(ref, { once: true, margin: "-15% 0px -15% 0px" })`
  // required the section to be ≥30 % deep into the viewport
  // before triggering. On iOS Safari, when the user lands on
  // this section via the scrollytelling fast-snap or fast
  // scroll, the IntersectionObserver callback can be coalesced
  // and the trigger never fires. With `animate={undefined}`
  // when inView=false, the letters stayed at their initial
  // hidden state (opacity:0, x:360) FOREVER, so the user just
  // saw a blank dark screen where the LED beat should be.
  // `whileInView` with `viewport={{ once: true, amount: 0.15 }}`
  // is much more robust on Safari + handles the case where the
  // section is partially scrolled off-screen at mount time.

  const ahhLetters = "AHHHH".split("");
  const tagline = "feel the joy of cashback".split(" ");

  return (
    <section
      ref={ref}
      aria-label="Ahhh, feel the joy of cashback"
      /* v6.13.11 — RESTORED to a full 100svh own-screen beat. The
         user explicitly wants this to be its own dedicated screen
         since the AHHHH letter-fly + tagline word-slide animation
         needs the visual real-estate to land. Earlier shrinks
         (60svh + items-start) made the beat feel like a label
         tucked between two sections instead of the cinematic
         pause it was designed as. Centred vertically + horizontally
         so the LED text sits in the middle of the viewport when
         the beat triggers. */
      className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden py-12 sm:py-16"
    >
      {/* v6.13.20 — Cash now FALLS FROM ABOVE rather than drifting
          UP from the bottom. Two user reports addressed:
          (1) "Money should fall on top from ahh feel joy" — flipped
              the animation direction. Bills start ABOVE the section
              (translateY(-150%)) and fall DOWN past the LED text to
              below the section (translateY(150%)).
          (2) "Cut off from the cash when falling on first frames" —
              the previous version pinned bills to the BOTTOM of a
              `h-[35svh]` container with `bottom-0`, so on the very
              first paint frame each bill was sitting half-clipped at
              the bottom edge of an overflow-hidden box (the 110%
              starting offset wasn't enough on small phones to hide
              them fully). Now: container fills the FULL section
              (inset-0), each bill is `top-0` and starts at -150%
              (entirely ABOVE the container's clip box) so the bill
              is invisible at frame 0 and only enters the visible
              region as the fall progresses — no half-clipped
              first-frame paint, ever. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <style>{`
          @keyframes ledCashFall {
            0%   { transform: translate3d(0, -150%, 0) rotate(var(--rot, -8deg)); opacity: 0; }
            15%  { opacity: 0.9; }
            55%  { transform: translate3d(calc(var(--sway, 8px)), 50%, 0) rotate(calc(var(--rot, -8deg) * -1)); opacity: 0.85; }
            100% { transform: translate3d(calc(var(--sway, 8px) * -1), 150%, 0) rotate(var(--rot, -8deg)); opacity: 0; }
          }
        `}</style>
        {[
          { left: "8%",  size: 36, delay: "0s",   dur: "5.4s", rot: "-9deg",  sway: "10px" },
          { left: "20%", size: 28, delay: "1.1s", dur: "6.2s", rot: "6deg",   sway: "-12px" },
          { left: "32%", size: 42, delay: "0.4s", dur: "5.0s", rot: "-5deg",  sway: "14px" },
          { left: "46%", size: 24, delay: "2.0s", dur: "7.0s", rot: "11deg",  sway: "-9px" },
          { left: "58%", size: 38, delay: "0.7s", dur: "5.6s", rot: "-12deg", sway: "11px" },
          { left: "70%", size: 30, delay: "1.6s", dur: "6.4s", rot: "8deg",   sway: "-13px" },
          { left: "82%", size: 34, delay: "0.2s", dur: "5.2s", rot: "-7deg",  sway: "12px" },
          { left: "92%", size: 26, delay: "2.3s", dur: "6.8s", rot: "10deg",  sway: "-10px" },
        ].map((b, i) => (
          <span
            key={i}
            className="absolute top-0"
            style={{
              left: b.left,
              width: b.size,
              height: b.size * 0.55,
              ["--rot" as string]: b.rot,
              ["--sway" as string]: b.sway,
              animation: reduce
                ? undefined
                : `ledCashFall ${b.dur} ${b.delay} ease-in-out infinite`,
              willChange: "transform, opacity",
            }}
          >
            <svg viewBox="0 0 60 33" width="100%" height="100%"
              style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(74,222,128,0.45))" }}>
              <rect x="1" y="1" width="58" height="31" rx="3" fill="#1f7d3a" stroke="#86efac" strokeWidth="0.8" />
              <circle cx="30" cy="16.5" r="8" fill="#143d22" stroke="#86efac" strokeWidth="0.6" />
              <text x="30" y="20.5" textAnchor="middle" fontFamily="'Courier New', monospace" fontWeight="900" fontSize="11" fill="#dcfce7">$</text>
            </svg>
          </span>
        ))}
      </div>

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
              whileInView={{ opacity: 1, x: 0, skewX: 0 }}
              viewport={{ once: true, amount: 0.15 }}
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
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.15 }}
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
