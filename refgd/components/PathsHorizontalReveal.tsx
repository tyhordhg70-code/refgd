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
 *     five cards use distinct anchors (left-low, top-mid, far-back-
 *     center, top-mid-right, right-low) so the group reveal feels
 *     like one coordinated camera move.
 *   • Mobile (< 768 px): NATIVE horizontal scroll-snap carousel.
 *     The OS owns the gesture (no JS scroll-jacking, no sticky pin,
 *     hardware-accelerated, perfect momentum). Each card animates
 *     IN with a 3D `cube-flip` reveal the first time it scrolls
 *     into the carousel viewport — when the user swipes to it, it
 *     unfolds from `rotateY: -68deg` to flat. After that first
 *     reveal it stays put, so swiping back doesn't re-trigger.
 *
 *   ── Why no JS scroll-jacking on mobile ───────────────────────
 *   The previous mobile implementation pinned the carousel for one
 *   full viewport, hijacked wheel + touchmove with preventDefault,
 *   and ran a rAF loop on every scroll-tick. That produced lag,
 *   huge gaps, jumps, broken scroll-up, and flicker. The rewrite
 *   uses native CSS scroll-snap on a horizontal flex container —
 *   the browser does this in the compositor without any JS, so it
 *   can never lag. The carousel section is its own normal-flow
 *   block whose height is just what the cards need (no 100 vh
 *   pin), so vertical scroll continues into the telegram section
 *   beneath without any teleport or edge release.
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  // `revealed[i]` flips to true the first time card i has been
  // ≥ 50 % visible inside the carousel track. Once true it never
  // flips back — the 3D unfold is a one-shot reveal per card so
  // swiping back to a previous card doesn't replay the animation.
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    cards.map((_, i) => i === 0),
  );

  // Single observer tracking which card is closest to the viewport
  // centre AND which cards have been seen at least once. Pure read
  // — never scrolls anything itself.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observers: IntersectionObserver[] = [];
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.intersectionRatio >= 0.5) {
              setRevealed((prev) => {
                if (prev[i]) return prev;
                const next = prev.slice();
                next[i] = true;
                return next;
              });
            }
            if (entry.intersectionRatio >= 0.6) {
              setActiveIndex(i);
            }
          }
        },
        {
          root: track,
          threshold: [0, 0.3, 0.5, 0.6, 0.9],
        },
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
          py-4 supplies vertical headroom so the 3D unfold (which
          briefly tilts the card forward) isn't clipped by the
          overflow-y-hidden bounds. */}
      <div
        ref={trackRef}
        data-testid="paths-mobile-track"
        className="flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
          const isRevealed = reduced || revealed[i];
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
                // Each slide its own 3D context so the unfold per
                // card doesn't drag siblings.
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
                  isRevealed
                    ? { rotateY: 0, rotateX: 0, scale: 1, opacity: 1 }
                    : { rotateY: -68, rotateX: 8, scale: 0.78, opacity: 0 }
                }
                transition={{
                  duration: 0.85,
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
