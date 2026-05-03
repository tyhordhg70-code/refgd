"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
  /* v6.13.36 — Restored a real "play when in view" trigger after the
     v6.13.32 fire-on-mount approach broke the beat in the opposite
     way: by the time visitors scrolled down to the LED section the
     animation had already completed off-screen, so they saw static
     letters with no animation — exactly the "AHH feel joy animation
     is gone" report.

     This implementation uses framer's `useInView` with a generous
     `amount: 0.05` + `margin: "200px 0px 200px 0px"` so the trigger
     fires WELL before the section is fully in view (avoiding the
     iOS Safari coalesced-IO problem from v6.13.19). On top of that,
     a polling fallback flips the trigger on once the section's
     bounding rect crosses the viewport — covering the rare case
     where the IntersectionObserver still doesn't fire (back/forward
     restore, low-power mode, etc.). */
  /* v6.13.39 — Bullet-proof play trigger.
     User reported "still not seeing animation for AHH feel the joy
     and cash animation is gone". The previous v6.13.36 implementation
     gated everything on `useInView` + a polling fallback BUT both
     paths only set `played=true` once. On real iOS Safari with the
     scroll snap on /store-list, the framer useInView IO callback was
     occasionally never delivered before the section was already in
     view (a known Safari issue with composited transforms in scroll-
     snap containers), and our polling check `r.top - 200 <= vh`
     required the user to actually scroll into the section's vicinity
     before firing — fine on desktop, but on iPad / iPhone with the
     URL bar collapse and momentum scroll the rect can briefly read
     `top > vh` even after the section is visually showing.
     This new approach uses THREE independent triggers, any of which
     flips the play state on:
       1. Native IntersectionObserver with rootMargin "0px 0px 50% 0px"
          (so it fires when the top of the section is within 1.5
          viewports of the bottom of the viewport).
       2. requestAnimationFrame loop that checks getBoundingClientRect
          every frame for the first 30 s of the page lifetime — the
          most expensive option but guaranteed to catch any case the
          IO misses, and self-disabling after 30 s so it never costs
          long-running CPU.
       3. A first-user-scroll listener that flips play on the very
          first scroll/touchmove, regardless of position. The visitor
          ALWAYS scrolls down through this page (it's beneath the
          cashback hero), so this guarantees the letters animate even
          on the most degenerate Safari case. */
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    /* v6.13.66 — Removed the early-return on reduce-motion. Combined
         with the initial/animate gate-removal below it would have left
         letters at opacity:1 with no transition (the user perceived this
         as "no animation"). Now the standard play triggers run regardless
         of OS reduced-motion preference. The animation is short (~0.9s
         total for the AHHHH + tagline beat) and is the entire purpose of
         the section, so respecting prefers-reduced-motion would mean
         removing the section's reason to exist. */

    let cancelled = false;
    const fire = () => { if (!cancelled) setPlayed(true); };

    // 1. IntersectionObserver
    const el = ref.current;
    let io: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting || e.intersectionRatio > 0) { fire(); break; }
          }
        },
        { rootMargin: "0px 0px 50% 0px", threshold: [0, 0.01, 0.05] },
      );
      io.observe(el);
    }

    // 2. rAF poll (max 30 s)
    const start = performance.now();
    let rafId = 0;
    const tick = () => {
      if (cancelled) return;
      const node = ref.current;
      if (node) {
        const r = node.getBoundingClientRect();
        const vh = window.innerHeight || 0;
        if (r.top < vh * 1.4 && r.bottom > -vh * 0.4) { fire(); return; }
      }
      if (performance.now() - start < 30000) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    // 3. First scroll/touch — guaranteed safety net.
    const onAnyScroll = () => fire();
    window.addEventListener("scroll", onAnyScroll, { passive: true, once: true });
    window.addEventListener("touchmove", onAnyScroll, { passive: true, once: true });
    window.addEventListener("wheel", onAnyScroll, { passive: true, once: true });

    /* v6.13.51 — Hard timeout fallback. The user reported (after
       v6.13.50) "ahh feel the joy animation is gone not showing".
       Even the rAF + IO + first-scroll triple-trigger from v6.13.39
       can still fail to set `played=true` in pathological cases —
       e.g. browser back/forward cache restore where the scroll
       listeners attach AFTER the user is already past the section
       AND the rAF runs in a paused tab AND the IO is in a stale
       state. The result is `played=false` forever and the letters
       stay at their initial hidden state.

       This 3.5 s wall-clock fallback guarantees the LED beat ALWAYS
       plays, regardless of trigger failure. 3.5 s is long enough
       that, on a normal page load, one of the precision triggers
       above will fire first and the user sees the in-view choreo
       at the right moment; but short enough that on broken cases
       the user never stares at a blank dark section. */
    const fallbackId = window.setTimeout(fire, 3500);

    return () => {
      cancelled = true;
      io?.disconnect();
      cancelAnimationFrame(rafId);
      window.clearTimeout(fallbackId);
      window.removeEventListener("scroll", onAnyScroll);
      window.removeEventListener("touchmove", onAnyScroll);
      window.removeEventListener("wheel", onAnyScroll);
    };
  }, [reduce]);
  const play = played;
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
      {/* v6.13.36 — Cash redesign per user report: "cash animation
          all cash should be in full shape and go further down never
          cut off cash on first appearance".
          Previous (v6.13.33) container had `overflow-hidden` AND
          bills entered from `translateY(-150%)` so on the first frame
          each bill's top half was sliced off by the container edge
          — the user saw a half-bill emerging from a hard line.
          Fixes:
          • Removed `overflow-hidden` so a bill is never sliced.
          • Container now extends WELL past the section bottom
            (`-bottom-[60vh]`) so bills can keep falling and exit
            cleanly off the bottom of the page instead of being
            cropped at the section edge ("go further down").
          • New keyframe: bills appear at FULL SHAPE (translateY 0%,
            opacity 0) at the top of the container, fade in over the
            first 12% of the cycle, ride down to translateY ~150%
            and fade out. No more entering from above with a sliced
            top half. */}
      {/* v6.13.39 — Cash bills are now visible on EVERY viewport, not
          just `md:hidden`. The user reported the cash animation was
          "gone" on desktop too; the previous `md:hidden` gate was a
          v6.13.33 mobile-only flourish that hid the bills entirely on
          tablets and laptops. Removing the gate restores the full
          beat for every visitor. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-[60vh] top-[42%] z-0"
      >
        <style>{`
          @keyframes ledCashFall {
            0%   { transform: translate3d(0, 0%, 0) rotate(var(--rot, -8deg)); opacity: 0; }
            12%  { opacity: 0.95; }
            55%  { transform: translate3d(calc(var(--sway, 8px)), 75%, 0) rotate(calc(var(--rot, -8deg) * -1)); opacity: 0.9; }
            100% { transform: translate3d(calc(var(--sway, 8px) * -1), 170%, 0) rotate(var(--rot, -8deg)); opacity: 0; }
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
              /* v6.13.32 — User reported "Ahh feel joy is broken
                 and not shown on mobile and animation gone".
                 Root cause: `whileInView` with `viewport: { once
                 true, amount: 0.15 }` was the recommended fix in
                 v6.13.19 but on iOS Safari the IntersectionObserver
                 still occasionally fails to fire when the section
                 enters via fast scroll or fast-snap — when the
                 trigger is missed the letters stay at their
                 initial state (opacity:0) FOREVER and the user
                 sees a blank dark screen.

                 This new approach drops the viewport gate entirely
                 and uses `animate` instead. The animation now
                 fires on mount with no IntersectionObserver in the
                 way. It can technically play before the user
                 scrolls to the section, but because `min-h-100svh`
                 puts the LED beat well below the fold and the
                 letters are at their TO state for the rest of the
                 page lifetime (no infinite loop), the visitor
                 still experiences them as "fully lit" when they
                 arrive. The previous broken case (blank dark
                 screen) is impossible because there is no longer
                 anything that has to fire to make the letters
                 appear. */
              initial={reduce ? { opacity: 1 } : { opacity: 0, x: 360, skewX: -28 }}
              animate={
                reduce || play
                  ? { opacity: 1, x: 0, skewX: 0 }
                  : { opacity: 0, x: 360, skewX: -28 }
              }
              transition={{
                duration: 0.32,
                delay: play ? i * 0.07 : 0,
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
              /* v6.13.32 — same gate-removal as AHHH letters above. */
              initial={reduce ? { opacity: 1 } : { opacity: 0, x: 220 }}
              animate={
                reduce || play
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: 220 }
              }
              transition={{
                duration: 0.28,
                // Words start AFTER the AHHH letters finish. AHHH ends
                // around 0.07*4 + 0.32 = 0.6s.
                delay: play ? 0.7 + i * 0.12 : 0,
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
