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
 * PathsHorizontalReveal — responsive path-card stage with 3D entrances.
 *
 *   ── Layouts ──────────────────────────────────────────────────
 *   • Desktop / tablet (≥ 768 px): all cards rendered together in
 *     a responsive grid. Each card is wrapped in `PathCardCameraFly`,
 *     a 3D camera-fly-in that flies the card from a far-back, off-
 *     axis position into its rest pose with rotateX + rotateY. The
 *     five cards use distinct anchors so the group reveal feels
 *     like one coordinated camera move.
 *
 *   • Mobile (< 768 px): NATIVE horizontal scroll-snap carousel.
 *     The OS owns the gesture (no JS scroll-jacking, no sticky
 *     pin, hardware-accelerated, perfect momentum). All cards
 *     animate in TOGETHER with a 0.12 s stagger the FIRST time
 *     the carousel section enters the viewport — by the time the
 *     user starts swiping, every card is already in its flat rest
 *     pose. Previously the reveal was per-card-IO at 50 % visibility
 *     which produced two real bugs the user reported:
 *       • "Scrolling right has to appear faster — blank screen": a
 *         freshly-swiped card was still rotated -68° / opacity 0
 *         until it crossed the 50 % threshold, so the user saw an
 *         empty slot for ~150 ms.
 *       • "Scrolling left breaks the card, half distorted and cut
 *         off": cards the user briefly swiped past without ever
 *         hitting 50 % visibility were stuck in their distorted
 *         start pose, so swiping back showed a half-rotated card.
 *     The single-trigger stagger eliminates both — all five cards
 *     reach their flat pose within ~1.3 s of the section entering
 *     view (which is roughly the same time the snap finishes), so
 *     subsequent swipes always show fully-revealed cards.
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
/* ------------------------------------------------------------------ */

function MobileSnapCarousel({ cards }: { cards: ReactNode[] }) {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // ALL cards reveal together when the carousel section first
  // enters the viewport. One observer, one boolean flip, and then
  // we never animate the cards again. This cures both:
  //   • "swipe right is blank" — by the time the user even starts
  //     swiping, all cards have already played their stagger and
  //     are sitting flat.
  //   • "swipe left distorts the card" — there's no per-card IO
  //     state to get stuck in a half-rotated pose for cards the
  //     user briefly swiped past.
  const [revealed, setRevealed] = useState(reduced);
  useEffect(() => {
    if (revealed) return;
    const sec = sectionRef.current;
    if (!sec) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
            setRevealed(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: [0, 0.1, 0.3] },
    );
    io.observe(sec);
    return () => io.disconnect();
  }, [revealed]);

  // Active-dot tracking. Pure read — never scrolls anything itself.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observers: IntersectionObserver[] = [];
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.intersectionRatio >= 0.6) {
              setActiveIndex(i);
            }
          }
        },
        { root: track, threshold: [0, 0.6, 0.9] },
      );
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach((io) => io.disconnect());
  }, [cards.length]);

  // Tap a dot to jump.
  const goTo = useCallback((i: number) => {
    const el = cardRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  return (
    <section
      ref={sectionRef}
      data-testid="paths-mobile-carousel"
      className="relative w-full"
      style={{ perspective: "1400px" }}
    >
      {/* Edge fade masks — purely visual, hint that more cards are
          off-screen on either side. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[rgb(5,6,10)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[rgb(5,6,10)] to-transparent" />

      {/* The track. Native horizontal scroll + CSS snap. NO JS
          scroll handlers, NO preventDefault, NO sticky pinning.
          py-8 supplies vertical headroom so:
            • the 3D unfold (which briefly tilts the card forward)
              isn't clipped by overflow-y-hidden
            • the static box-shadow glow on each card (defined by
              the .pulse-glow-* classes, mobile-overridden in
              globals.css to a 22 px reach) isn't cut off at the
              top or bottom edge of the track.
          (Desktop pulse-glow keyframes have ~130 px reach, but
          they're disabled on mobile — see globals.css mobile
          override.) */}
      <div
        ref={trackRef}
        data-testid="paths-mobile-track"
        className="flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth py-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollPaddingLeft: "8vw",
          scrollPaddingRight: "8vw",
          touchAction: "pan-x pan-y",
          WebkitOverflowScrolling: "touch",
          // Preserve 3D so the per-card rotateY actually renders in
          // perspective rather than flattening to a 2D scaleX.
          transformStyle: "preserve-3d",
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
          return (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              data-testid={`paths-mobile-slide-${i + 1}`}
              className="relative shrink-0 snap-center snap-always px-2"
              style={{
                width: "84vw",
                // Each slide has its own 3D context so the unfold
                // per card doesn't drag siblings.
                perspective: "1400px",
                transformStyle: "preserve-3d",
              }}
            >
              <motion.div
                className="h-full"
                initial={
                  reduced
                    ? false
                    : { rotateY: -68, rotateX: 8, scale: 0.78, opacity: 0 }
                }
                animate={
                  revealed
                    ? { rotateY: 0, rotateX: 0, scale: 1, opacity: 1 }
                    : { rotateY: -68, rotateX: 8, scale: 0.78, opacity: 0 }
                }
                transition={{
                  duration: 0.85,
                  delay: revealed ? i * 0.12 : 0,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: "50% 50%",
                  willChange: "transform, opacity",
                }}
              >
                {renderedCard}
              </motion.div>
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
