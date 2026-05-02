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
  const headlineRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Smooth scroll-driven fades for:
  //   • the "scroll" indicator at the bottom of the hero (fades 1 → 0
  //     over the first 6% of section progress)
  //   • the WELCOME headline (gentle scale-up + fade as you scroll past)
  //
  // Implementation: ONE rAF-throttled scroll listener that does ONE
  // getBoundingClientRect + a couple of style writes per frame.
  // (Previous IntersectionObserver-only version made the indicator
  // pop on/off instead of smoothly fading — user feedback: "what
  // happened to the old design of home page the scroll animation".)
  useEffect(() => {
    const section = sectionRef.current;
    const scrollInd = scrollIndRef.current;
    const headline = headlineRef.current;
    if (!section) return;
    let raf = 0;
    let queued = false;
    let lastInd = -1;
    let lastH = -1;
    // Framer-motion owns transform/opacity for the entrance (delay 1s
    // + duration 1s = settled at ~2.0s). Until then, the scroll
    // listener must NOT write transform on the headline or the
    // entrance animation gets clobbered. After that window, we can
    // safely apply a steady cursor-parallax transform even when the
    // user is at the very top of the page (p2 = 0).
    let framerDone = false;
    const framerTimer = window.setTimeout(() => {
      framerDone = true;
      // Immediately write the idle var-based transform so the
      // cursor-parallax effect (which writes only --hero-px /
      // --hero-py CSS vars) takes visible effect right away,
      // without requiring the user to scroll first.
      if (headline) {
        headline.style.transform =
          "translate3d(var(--hero-px,0px), var(--hero-py,0px), 0)";
      }
    }, 2100);
    // Headline ownership: framer-motion drives the delayed entrance
    // (initial → animate over ~1s after a 1s delay). The rAF listener
    // only takes over once the user has actually scrolled past the
    // headline-fade threshold (p2 > 0). Until then we don't write
    // style.transform/opacity at all, so framer's animation is never
    // clobbered.
    const update = () => {
      queued = false;
      const rect = section.getBoundingClientRect();
      const sectionH = section.offsetHeight;
      const viewH = window.innerHeight;
      const raw = -rect.top / Math.max(1, sectionH - viewH);
      const progress = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      // Scroll indicator: visible only at the very top, fades fast.
      if (scrollInd) {
        const ind = Math.max(0, Math.min(1, 1 - progress / 0.06));
        if (Math.abs(ind - lastInd) > 0.005) {
          lastInd = ind;
          scrollInd.style.opacity = ind.toFixed(3);
        }
      }
      // WELCOME headline: slight scale-up + drift + fade once the
      // user has scrolled past 30% of the section.
      if (headline) {
        const p2 = Math.max(0, Math.min(1, (progress - 0.30) / 0.40));
        // Skip writes while p2 is exactly 0 — framer-motion still owns
        // transform/opacity during the entrance animation. Only take
        // over once the scroll fade actually starts (p2 > 0). And once
        // we've returned to p2=0 (user scrolled back to top), restore
        // a clean transform so framer can take over again.
        if (p2 > 0) {
          if (Math.abs(p2 - lastH) > 0.005) {
            lastH = p2;
            const scale = 1 + p2 * 0.18;
            const op = 1 - p2;
            // Compose the scroll dolly with the cursor parallax via
            // the var(--hero-px / --hero-py) values written by the
            // pointermove rAF below. We use calc() inside translate3d
            // so the GPU sums the two transforms — one author writes
            // both axes at once instead of fighting over the prop.
            headline.style.transform =
              `translate3d(var(--hero-px,0px), calc(var(--hero-py,0px) + ${(-p2 * 24).toFixed(1)}px), 0) scale(${scale.toFixed(3)})`;
            headline.style.opacity = op.toFixed(3);
          }
        } else if (lastH > 0) {
          lastH = 0;
          // Restore an idle transform that still honours the cursor
          // parallax variables — so once the scroll-fade releases
          // ownership the cursor drift continues seamlessly.
          headline.style.transform =
            "translate3d(var(--hero-px,0px), var(--hero-py,0px), 0)";
          headline.style.opacity = "";
        } else if (framerDone) {
          // No scroll fade in effect AND framer's entrance has fully
          // settled: keep the cursor parallax live by writing only
          // the var-based translate. We do NOT touch opacity here.
          headline.style.transform =
            "translate3d(var(--hero-px,0px), var(--hero-py,0px), 0)";
        }
      }
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Initial sync — only updates the indicator opacity if needed; the
    // headline writer is gated on p2>0 so the entrance animation is
    // never clobbered.
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(framerTimer);
    };
  }, []);

  // ── HEADLINE CURSOR PARALLAX ─────────────────────────────────────
  // Lusion / nomoo-labs signature: the foreground headline drifts on
  // its OWN plane in response to the cursor, so the visitor reads
  // three depths (worker cosmos behind ← headline middle ← cursor
  // front). Disabled on touch / reduced-motion. Composes with the
  // scroll-fade above by writing only to translate3d X/Y while the
  // scroll listener owns Y/scale on the same element — we apply the
  // cursor offset as a CSS variable the scroll listener reads, so
  // the two never fight each other.
  useEffect(() => {
    const headline = headlineRef.current;
    if (!headline) return;
    if (typeof window === "undefined") return;
    if (reduced) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;

    let raf = 0;
    const cur = { x: 0, y: 0 };
    const tgt = { x: 0, y: 0 };
    let active = false;

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      // -1 → +1, slightly biased toward 0 in the centre band
      tgt.x = (e.clientX / w - 0.5) * 2;
      tgt.y = (e.clientY / h - 0.5) * 2;
      if (!active) {
        active = true;
        loop();
      }
    }
    function loop() {
      cur.x += (tgt.x - cur.x) * 0.08;
      cur.y += (tgt.y - cur.y) * 0.08;
      // Headline parallax magnitude is intentionally small so it
      // reads as ambient drift, not motion sickness.
      const px = cur.x * 14;
      const py = cur.y * 9;
      headline!.style.setProperty("--hero-px", `${px.toFixed(1)}px`);
      headline!.style.setProperty("--hero-py", `${py.toFixed(1)}px`);
      // Stop the rAF loop when basically settled to spare battery.
      if (Math.abs(tgt.x - cur.x) < 0.001 && Math.abs(tgt.y - cur.y) < 0.001) {
        active = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

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
          ref={headlineRef}
          className="container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center will-change-transform"
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 1.0 }}
          // After the entrance settles, the rAF scroll listener owns
          // `style.transform` and `style.opacity` to drive the
          // scroll-linked dolly/fade. style.transform overwrites the
          // framer-motion transform once scrolling begins.
          style={{ transformOrigin: "50% 50%" }}
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
