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
 *   • Desktop / tablet (≥ 768 px): all cards in a responsive grid,
 *     each wrapped in `PathCardCameraFly` for a 3D camera-fly-in.
 *
 *   • Mobile (< 768 px): NATIVE horizontal scroll-snap carousel
 *     with a SCROLL-DRIVEN coverflow effect. Each card's rotateY,
 *     scale and opacity are continuously updated based on its
 *     distance from the centre of the track, so:
 *       • Every swipe produces visible animation in real time
 *         (cards tilt away, the centred card stays flat) — the
 *         user's "animation is gone" complaint.
 *       • Edge cards stay in their natural bounding box (we only
 *         tilt + lightly scale, never opacity:0 / scale:0.78), so
 *         no card ever appears half-cut-off mid-scroll — the
 *         "half the card cuts off" complaint.
 *       • Updates are rAF-throttled and use direct DOM transform
 *         writes (no framer-motion per-frame work), so this is
 *         very cheap on mobile compositors.
 *
 *     The track uses `touch-action: pan-x` so iOS only routes
 *     HORIZONTAL touch movement to the carousel; vertical drags
 *     bubble straight up to the document scroller. This fixes
 *     the intermittent "can't scroll up from telegram box"
 *     complaint that came from iOS axis-locking the gesture to
 *     the carousel's horizontal axis the moment the touch had
 *     any horizontal component.
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
/*  Mobile — NATIVE HORIZONTAL SCROLL-SNAP CAROUSEL with COVERFLOW    */
/* ------------------------------------------------------------------ */

function MobileSnapCarousel({ cards }: { cards: ReactNode[] }) {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardWrapRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardInnerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Coverflow update ────────────────────────────────────────
  // For each card, compute its centre's signed distance from the
  // track's centre, normalise by card width, then map to a
  // rotateY / scale / opacity. Adjacent cards tilt away in 3D,
  // the centred card sits flat. Active dot is whichever card has
  // the smallest absolute distance.
  const updateTransforms = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let bestIndex = 0;
    let bestDist = Infinity;
    for (let i = 0; i < cardInnerRefs.current.length; i++) {
      const inner = cardInnerRefs.current[i];
      const wrap = cardWrapRefs.current[i];
      if (!inner || !wrap) continue;
      const r = wrap.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;
      const distPx = cardCenter - trackCenter;
      const distNorm = r.width > 0 ? distPx / r.width : 0;
      const clamped = Math.max(-1.4, Math.min(1.4, distNorm));
      if (reduced) {
        // Reduced motion → flat, no transform changes per frame.
        inner.style.transform = "none";
        inner.style.opacity = "1";
      } else {
        const rotateY = clamped * -32;
        const scale = 1 - Math.min(0.18, Math.abs(clamped) * 0.18);
        const opacity = Math.max(0.45, 1 - Math.abs(clamped) * 0.55);
        inner.style.transform = `perspective(1400px) rotateY(${rotateY.toFixed(
          2,
        )}deg) scale(${scale.toFixed(3)})`;
        inner.style.opacity = opacity.toFixed(3);
      }
      const absDist = Math.abs(distPx);
      if (absDist < bestDist) {
        bestDist = absDist;
        bestIndex = i;
      }
    }
    setActiveIndex((prev) => (prev === bestIndex ? prev : bestIndex));
  }, [reduced]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateTransforms();
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    // Initial paint.
    updateTransforms();
    // Re-measure on viewport resize / orientation change.
    const ro = new ResizeObserver(() => updateTransforms());
    ro.observe(track);
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [updateTransforms]);

  // Tap a dot to jump.
  const goTo = useCallback((i: number) => {
    const el = cardWrapRefs.current[i];
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
      {/* Edge fade masks — visual hint that more cards are off-screen. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[rgb(5,6,10)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[rgb(5,6,10)] to-transparent" />

      {/* The track. Native horizontal scroll + CSS snap.
          py-8 supplies vertical headroom so the static box-shadow
          glow on each card (mobile-overridden in globals.css to a
          22 px reach) isn't cut off at the top or bottom.

          touch-action: pan-x means iOS only routes horizontal pans
          to this element; vertical drags bubble up to the document.
          That eliminates the iOS axis-lock that was occasionally
          eating vertical scroll attempts and producing the "can't
          scroll up from telegram box sometimes" complaint. */}
      <div
        ref={trackRef}
        data-testid="paths-mobile-track"
        className="flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth py-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollPaddingLeft: "8vw",
          scrollPaddingRight: "8vw",
          touchAction: "pan-x",
          WebkitOverflowScrolling: "touch",
          transformStyle: "preserve-3d",
          overscrollBehaviorX: "contain",
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
                cardWrapRefs.current[i] = el;
              }}
              data-testid={`paths-mobile-slide-${i + 1}`}
              className="relative shrink-0 snap-center snap-always px-2"
              style={{
                width: "84vw",
                perspective: "1400px",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                ref={(el) => {
                  cardInnerRefs.current[i] = el;
                }}
                className="h-full"
                style={{
                  transformStyle: "preserve-3d",
                  transformOrigin: "50% 50%",
                  willChange: "transform, opacity",
                  transform: "perspective(1400px) rotateY(0deg) scale(1)",
                  opacity: 1,
                }}
              >
                {renderedCard}
              </div>
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
