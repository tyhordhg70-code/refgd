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

/**
 * PathsHorizontalReveal — responsive path-card stage.
 *
 *   ── Layouts ──────────────────────────────────────────────────
 *   • Desktop / tablet (≥ 768px): all cards rendered together in
 *     the responsive grid supplied by the page (`desktopFallback`).
 *     The grid container itself does a single fade-and-lift on
 *     enter, and each card animates in with a staggered 3D fly-in.
 *
 *   • Mobile (< 768px): NATIVE horizontal scroll-snap carousel.
 *     One row of cards, swipe left/right to advance — the OS owns
 *     the gesture, so it's hardware-accelerated, has perfect
 *     momentum, and never fights iOS Safari.
 *
 *   ── Why no JS scroll-jacking on mobile ───────────────────────
 *
 *   The previous mobile implementation pinned the carousel for
 *   one full viewport, hijacked wheel + touchmove with
 *   preventDefault, and ran a rAF loop on every scroll-tick. That
 *   produced every problem the user reported in the latest pass:
 *
 *     • Lag — non-passive wheel listeners + per-frame JS scrollTo
 *       force the browser to wait on JS for every scroll frame
 *       and starve the GPU compositor.
 *     • Huge gap — the section was 100 vh tall but only contained
 *       a centred ~480 px card stack, leaving ~360 px of empty
 *       space above and below.
 *     • Huge jump after cards — at the bottom edge the lock
 *       released by calling `window.scrollTo({behavior:'smooth'})`
 *       to sectionTop + viewport, a JS-driven teleport.
 *     • Scroll-up broken — the IntersectionObserver lock didn't
 *       re-engage after a fast exit, leaving subsequent scrolls
 *       unrelated.
 *     • Flicker — every wheel re-pinned scrollY, causing the
 *       page to oscillate against its own momentum frame.
 *
 *   The rewrite removes ALL of that and uses native CSS scroll-
 *   snap on a horizontal flex container. Browsers do this in the
 *   compositor without any JS, so it can't lag. The carousel
 *   section is its own normal-flow block whose height is just
 *   what the cards need (no 100 vh pin), so vertical scroll
 *   simply continues into the telegram section beneath it — no
 *   teleport, no jump, no edge release logic.
 *
 *   "One scroll = one card" comes from `scroll-snap-type: x
 *   mandatory` + `scroll-snap-stop: always` — a single swipe
 *   lands on exactly one card, even on a hard fling. Pagination
 *   dots passively follow whichever card is closest to centre via
 *   IntersectionObserver (read-only, no scroll mutation).
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
              <FlyInCard key={i} index={i}>
                {c}
              </FlyInCard>
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Passively observe which card is closest to the viewport centre
  // and update the dots. Pure read — never scrolls anything itself.
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
        {
          root: track,
          // Trigger when the card occupies most of the carousel
          // viewport — i.e. it's the centred / current card.
          threshold: [0, 0.3, 0.6, 0.9],
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
    >
      {/* Edge fade masks — purely visual, hint that more cards are
          off-screen on either side. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[rgb(5,6,10)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[rgb(5,6,10)] to-transparent" />

      {/* The track. Native horizontal scroll + CSS snap. NO JS
          scroll handlers, NO preventDefault, NO sticky pinning. */}
      <div
        ref={trackRef}
        data-testid="paths-mobile-track"
        className="flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // 8 vw of inset on each side centres the first/last card
          // in the viewport when fully snapped.
          scrollPaddingLeft: "8vw",
          scrollPaddingRight: "8vw",
          // Vertical scroll inside the track does nothing (overflow-
          // y-hidden); the page's vertical scroll still works because
          // touch-action allows pan-y to bubble up.
          touchAction: "pan-x pan-y",
          WebkitOverflowScrolling: "touch",
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

/* ------------------------------------------------------------------ */
/*  FlyInCard — shared per-card cinematic 3D entrance                 */
/* ------------------------------------------------------------------ */

function FlyInCard({
  children,
  index,
  isMobile,
  className,
  style,
  ...rest
}: {
  children: ReactNode;
  index: number;
  isMobile?: boolean;
  className?: string;
  style?: React.CSSProperties;
} & Record<string, unknown>) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <div className={className} style={style} {...rest}>
        {children}
      </div>
    );
  }
  const initial = isMobile
    ? { opacity: 0, y: 30 }
    : { opacity: 0, y: 80, scale: 0.85, rotateX: 18 };
  const inView = isMobile
    ? { opacity: 1, y: 0 }
    : { opacity: 1, y: 0, scale: 1, rotateX: 0 };
  return (
    <motion.div
      {...(rest as Record<string, unknown>)}
      className={className}
      initial={initial}
      whileInView={inView}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: isMobile ? 0.6 : 0.95,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        ...(isMobile ? {} : { transformStyle: "preserve-3d" }),
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
