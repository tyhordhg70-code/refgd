"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import PathCardCameraFly from "./PathCardCameraFly";

/**
 * PathsHorizontalReveal — responsive path-card stage.
 *
 *   ── Layouts ──────────────────────────────────────────────────
 *   • Desktop / tablet (≥ 768 px): grid of cards wrapped in
 *     PathCardCameraFly for the 3D camera-fly entrance.
 *
 *   • Mobile (< 768 px): NATIVE horizontal scroll-snap carousel
 *     with a COMPOSITOR-ONLY focus animation.
 *
 *     Iteration history that informs this design:
 *       1. First version did per-frame JS transform writes on
 *          every scroll event (rAF-throttled). On iPhone the
 *          per-frame style mutations fought the browser's own
 *          snap-scroll compositor: when the user reversed
 *          direction (right after swiping left) the JS would
 *          land a transform mid-snap, producing the "half the
 *          card breaks and distorts" the user reported.
 *       2. Replaced rotateY tilt with subtle scale — same
 *          underlying problem (still per-frame JS writes).
 *
 *     Final design (this file):
 *       • ZERO per-frame JS during scroll.
 *       • Native CSS scroll-snap (snap-x, snap-mandatory) does
 *         all the alignment.
 *       • A SINGLE IntersectionObserver fires only when the
 *         currently-centred card CHANGES. We just toggle a
 *         CSS class on the active card.
 *       • A CSS transition (transform 260ms, opacity 260ms,
 *         filter 260ms) animates the focus change entirely on
 *         the GPU compositor — one transition per state change,
 *         not one per frame. Reversing direction never produces
 *         distortion because the browser only ever runs the
 *         CSS transition with consistent transform state.
 *       • touch-action: pan-x means iOS only routes horizontal
 *         touches to the carousel; vertical drags bubble up to
 *         the document scroller — fixes "can't scroll down on
 *         path cards / scroll up bounces back".
 */
export default function PathsHorizontalReveal({
  cards,
  desktopFallback,
}: {
  cards: ReactNode[];
  desktopFallback?: ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!mounted || !isMobile) {
    return <DesktopGrid cards={cards} desktopFallback={desktopFallback} />;
  }

  return <MobileSnapCarousel cards={cards} />;
}

/* ------------------------------------------------------------------ */
/*  Desktop / tablet                                                  */
/* ------------------------------------------------------------------ */

function DesktopGrid({
  cards,
  desktopFallback,
}: {
  cards: ReactNode[];
  desktopFallback?: ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <section
      data-testid="paths-desktop-grid"
      className="relative mx-auto w-full py-6"
      style={{ perspective: "1600px" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <motion.div
        className="relative px-2 sm:px-4"
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
        }
      >
        {desktopFallback ?? (
          <div className="mx-auto grid w-full max-w-[1500px] grid-cols-2 items-stretch gap-4 sm:grid-cols-3 md:gap-5 xl:grid-cols-5 xl:gap-6">
            {cards.map((c, i) => (
              <PathCardCameraFly key={i} index={i}>
                {c}
              </PathCardCameraFly>
            ))}
          </div>
        )}
        <p className="heading-display mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.38em] text-white/55 sm:text-xs">
          Choose your door
        </p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile — NATIVE HORIZONTAL SCROLL-SNAP CAROUSEL                   */
/*  Compositor-only focus animation, ZERO per-frame JS during scroll  */
/* ------------------------------------------------------------------ */

function MobileSnapCarousel({ cards }: { cards: ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  /* ── Active-card detection ──────────────────────────────────
   * Use ONE IntersectionObserver per slide, with the carousel
   * track as the root and a rootMargin that shrinks the
   * intersection box to a narrow vertical band in the centre.
   * A slide is "intersecting" only when its centre is inside
   * that band, which means it's the currently-snapped card.
   * The observer callback runs at most a few times per swipe
   * (when a card enters/leaves the centre band) — never per
   * frame, never per scroll event.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Centre band = inner 1% of the track. Only one card centre
    // can fit in there at a time, so we always identify exactly
    // one active card.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.slideIndex,
            );
            if (Number.isFinite(idx)) {
              setActiveIndex(idx);
            }
          }
        }
      },
      {
        root: track,
        // shrink left/right by 49.5% each → 1% wide centre band
        rootMargin: "0px -49.5% 0px -49.5%",
        threshold: 0,
      },
    );
    for (const el of slideRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [cards.length]);

  // Tap a dot to jump.
  const goTo = useCallback((i: number) => {
    const el = slideRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  return (
    <section
      data-testid="paths-mobile-carousel"
      className="relative w-full"
    >
      {/* Edge fade masks — visual hint that more cards are off-screen. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[rgb(5,6,10)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[rgb(5,6,10)] to-transparent" />

      {/* The track. Native horizontal scroll + CSS snap-mandatory.
          touch-action: pan-x → iOS only routes horizontal touches
          to this element; vertical drags bubble up to the document
          (fixes "can't scroll down on path cards"). */}
      <div
        ref={trackRef}
        data-testid="paths-mobile-track"
        className="flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth py-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollPaddingLeft: "8vw",
          scrollPaddingRight: "8vw",
          touchAction: "pan-x",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          overscrollBehaviorY: "auto",
        }}
      >
        {/* Leading spacer so the first card snaps to viewport centre. */}
        <div aria-hidden="true" className="shrink-0" style={{ width: "8vw" }} />
        {cards.map((card, i) => {
          const renderedCard = isValidElement(card)
            ? cloneElement(card as ReactElement<{ noReveal?: boolean }>, {
                noReveal: true,
              })
            : card;
          const isActive = i === activeIndex;
          return (
            <div
              key={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              data-slide-index={i}
              data-testid={`paths-mobile-slide-${i + 1}`}
              data-active={isActive ? "true" : "false"}
              // `path-card-slide` carries the CSS transition for the
              // focus animation. The class flip when activeIndex
              // changes is the ONLY animation trigger on swipe — no
              // per-frame JS, no fighting the snap compositor.
              className="path-card-slide relative shrink-0 snap-center snap-always px-2"
              style={{ width: "84vw" }}
            >
              {renderedCard}
            </div>
          );
        })}
        {/* Trailing spacer so the last card snaps to viewport centre. */}
        <div aria-hidden="true" className="shrink-0" style={{ width: "8vw" }} />
      </div>

      {/* Pagination dots — passive read of activeIndex. Tap to jump. */}
      <div
        className="mt-2 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Paths carousel pagination"
      >
        {cards.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={activeIndex === i}
            aria-label={`Go to card ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === i
                ? "w-6 bg-amber-300"
                : "w-1.5 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
      <p
        aria-hidden="true"
        className="mt-3 heading-display text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-white/55"
      >
        Swipe to choose your door
      </p>
    </section>
  );
}
