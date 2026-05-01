"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import KineticText from "./KineticText";

/**
 * CosmicJourney — cinematic scroll-linked welcome.
 *
 * REWRITE: every cosmic visual (nebula, planet, halo, mount streaks,
 * ambient pulse, warp filler shooting stars) has been moved from the
 * DOM into the shared Web-Worker WebGL canvas. The worker's "home"
 * scene now renders: planet + halo ring + 3 GLSL fbm-noise nebula
 * clouds + scroll-driven warp streak particle system, all off the
 * main thread.
 *
 * What still lives in the DOM here:
 *   • The sticky <section> scaffold (controls scroll height)
 *   • The KineticText "WELCOME" headline (text needs the React tree)
 *   • The "scroll" indicator at the bottom of the hero
 *
 * What was removed:
 *   • framer-motion nebula gradient div + 40 px blur stack
 *   • Mount-streak grid (36 desktop / 6 mobile span elements with
 *     framer-motion x/y/opacity/scaleX keyframe arrays)
 *   • Central planet div with multi-stop radial gradient + 260 px
 *     box-shadow halo (the most expensive single paint on the page)
 *   • Ambient pulse infinite framer loop
 *   • Halo ring border + inset shadow div
 *   • Mid-flight white flash + 20 warp-streak grid
 *   • Warp filler section: 28 CSS-keyframe shooting stars across a
 *     115svh decorative gap
 *
 * Why this is safe: the worker scene fades the planet alpha as the
 * `scroll` uniform rises, so the cinematic "warp away" feel is
 * preserved — but the page no longer pays per-scroll repaint cost
 * for any of the cinematic layers.
 *
 * The scroll indicator still fades on scroll; it's the only DOM
 * element here that needs scroll-progress. We keep a tiny passive
 * scroll listener that mutates one `style.opacity` per frame —
 * roughly free.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  const sectionRef    = useRef<HTMLElement>(null);
  const scrollIndRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Scroll indicator: was a per-scroll-event getBoundingClientRect + style
  // write (cheap individually, but iOS Safari fires scroll events at very
  // high frequency and even bounded layout reads contend for the main
  // thread mid-flick). Replaced with an IntersectionObserver pair that
  // toggles the indicator only at the section-top threshold — zero
  // per-scroll JS while the user is mid-flick.
  useEffect(() => {
    const section = sectionRef.current;
    const scrollInd = scrollIndRef.current;
    if (!section || !scrollInd) return;
    // Visible only while the section's top edge is within the top 6% of the
    // viewport (i.e. the user has just landed on the home hero and hasn't
    // started scrolling away yet).
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          scrollInd.style.opacity = e.isIntersecting ? "1" : "0";
        }
      },
      { rootMargin: "0px 0px -94% 0px", threshold: 0 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative w-full"
      style={{ height: isMobile ? "180svh" : "215svh" }}
    >
      <div
        className="sticky top-0 grid w-full place-items-center overflow-hidden"
        style={{ height: "100svh", contain: "layout paint" }}
      >
        {/* ── WELCOME headline (the only DOM cinematic now) ──
            All other visuals (planet/halo/nebula/warp streaks) are
            rendered by the worker's `home` scene activated by
            HomeBackground. */}
        <motion.div
          className="container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center"
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 1.0 }}
        >
          <KineticText
            as="h1"
            text={kicker}
            className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
            style={{ textShadow: "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)" }}
            stagger={0.08}
            delay={1.1}
          />
        </motion.div>

        {/* ── Scroll hint — opacity mutated by the lightweight scroll listener above ── */}
        <div
          ref={scrollIndRef}
          className="absolute bottom-12 z-[6] flex flex-col items-center gap-3 text-white"
          data-testid="hero-scroll-indicator"
          style={{ opacity: 1 }}
        >
          <span
            className="heading-display text-xs font-bold uppercase tracking-[0.5em] sm:text-sm"
            style={{ textShadow: "0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,237,180,0.65)" }}
          >
            scroll
          </span>
          <span className="block h-14 w-[2px] animate-pulseGlow rounded-full bg-gradient-to-b from-amber-200 via-white/80 to-transparent" style={{ boxShadow: "0 0 14px rgba(255,237,180,0.7)" }} />
        </div>
      </div>
    </section>
  );
}
