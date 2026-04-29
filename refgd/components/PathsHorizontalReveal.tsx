"use client";

import {
  cloneElement,
  isValidElement,
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
 *   • Mobile (< 768px): native CSS horizontal-scroll carousel.
 *     Uses `overflow-x-auto` + `scroll-snap-type: x mandatory` —
 *     NO sticky-pinned scroll-jacking, NO `useScroll`. Vertical
 *     page scroll passes through naturally; only horizontal
 *     swipes on the carousel itself move between cards. Each
 *     card snaps into view, and each one still gets the 3D
 *     fly-in entrance from `FlyInCard` so it animates in as it
 *     scrolls into the horizontal viewport (and re-animates on
 *     scroll back, because `viewport={{ once: false }}`).
 *
 *   ── Persistence on scroll-up & scroll-down ────────────────────
 *   The card entrance uses `viewport={{ once: true, amount: … }}`
 *   so the 3D fly-in REPLAYS every time a card enters the viewport
 *   — not just the first time. Scrolling up to the top of the page
 *   and then back down replays the entrance for the cards that
 *   re-cross the threshold, which is what the user explicitly asked
 *   for.
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

  return <MobileHorizontalCarousel cards={cards} />;
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
/*  Mobile — native CSS horizontal-scroll carousel                    */
/* ------------------------------------------------------------------ */

/**
 * Native scroll-snap carousel.
 *
 * Why native and not a sticky-pinned scroll-jacked stage?
 *
 *   The previous sticky-pin implementation hijacked vertical scroll
 *   to advance the carousel horizontally, which broke the page in
 *   several ways: (1) scrolling back up after passing the section
 *   would land the user mid-stage with the page in an inconsistent
 *   state, (2) iOS rubber-banding fought the scroll listener, and
 *   (3) any scroll-event-driven re-paint on a long page felt laggy.
 *
 *   Native `overflow-x-auto` + `scroll-snap-type: x mandatory`
 *   gives the user the same "swipe between cards" UX with zero
 *   custom JS, zero scroll-jacking and a perfectly natural feel.
 *   The page's vertical scroll is completely independent of this
 *   inner horizontal scroller.
 */
function MobileHorizontalCarousel({ cards }: { cards: ReactNode[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track which card is closest to the snap origin so we can
  // light up the matching dot. Uses scroll events (passive) and a
  // simple math computation — no IntersectionObserver overhead.
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const onScroll = () => {
      const cardWidth = sc.scrollWidth / cards.length;
      const idx = Math.round(sc.scrollLeft / cardWidth);
      setActiveIndex(Math.max(0, Math.min(cards.length - 1, idx)));
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => sc.removeEventListener("scroll", onScroll);
  }, [cards.length]);

  const goTo = (i: number) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const cardWidth = sc.scrollWidth / cards.length;
    sc.scrollTo({ left: cardWidth * i, behavior: "smooth" });
  };

  return (
    <section
      data-testid="paths-mobile-stage"
      className="relative w-full pb-2"
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-amber-300/10 blur-3xl" />

      {/*
       * The scroller.
       *
       * Card width is 70vw (capped at 300px). On a 390 px iPhone
       * viewport that's ~273 px, so ~85 px of the next card peeks
       * past the right edge — a clear visual signal that there's
       * more to swipe to. Previously cards were 78vw which left
       * only ~54 px of peek; users couldn't tell at a glance that
       * 4 more cards existed.
       *
       * touchAction: "pan-x" tells the browser this scroller is
       * for HORIZONTAL swipes only — vertical swipes pass straight
       * through to the page. Without this hint mobile browsers
       * have to wait for the gesture direction to settle before
       * deciding whether to scroll the page or the carousel,
       * which adds a perceptible 100-300 ms input delay on iOS
       * Safari. Combined with overscrollBehaviorX: contain, the
       * page scroll is now completely insulated from this widget.
       */}
      {/*
       * Mobile carousel — important behavior notes:
       *
       *   • `scroll-snap-stop: always` on every card forces the
       *     browser to STOP at every card regardless of swipe
       *     velocity, even if the user flicks hard. That's the
       *     "one card per scroll" feel the user asked for: a
       *     swipe in either direction always lands on the
       *     immediately-next card, never skips. Native CSS,
       *     compositor-driven, zero JS in the animation loop.
       *
       *   • `overflowY: "hidden"` is critical. With
       *     `overflow-x: auto` the spec forces overflow-y to
       *     also be auto, which in turn allowed vertical
       *     scrolling inside the carousel and created a
       *     scrollHeight > clientHeight layout (≈64 px of
       *     vertical overflow). Forcing it to hidden eliminates
       *     the inner vertical scroll entirely, while still
       *     allowing horizontal scrolling. Cards never get
       *     vertically clipped or shifted by an inner
       *     scrollTop.
       *
       *   • No FlyInCard wrapper on mobile cards — see the long
       *     comment above the mobile branch in this component
       *     for why entrance animations on a horizontally-
       *     scrolling carousel are pathological under framer
       *     `whileInView`.
       */}
      <div
        ref={scrollerRef}
        data-testid="paths-mobile-scroller"
        className="relative -mx-4 overflow-x-auto px-4 pt-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          overflowY: "hidden",
          scrollPaddingLeft: "1rem",
          touchAction: "pan-x",
        }}
      >
        <div className="flex w-max items-stretch gap-3">
          {cards.map((card, i) => {
            // Inject `noReveal` into PathCard so the card renders in
            // its final visual state from the start. Without this,
            // PathCard's default size="md" branch triggers a
            // `whileInView` IntersectionObserver entrance reveal, and
            // cards waiting horizontally off-screen in the carousel
            // queue (cards 3-5 at x=586+, viewport=390 wide) never
            // intersect the window viewport and stay frozen at their
            // initial state (`opacity:0, y:80, scale:0.85, rotateX:18`)
            // forever. cloneElement is safe here because every entry
            // in `cards` is a `<PathCard>` element passed in from the
            // page. Non-element children (strings, numbers) are passed
            // through unchanged.
            const renderedCard =
              isValidElement(card)
                ? cloneElement(card as ReactElement<{ noReveal?: boolean }>, {
                    noReveal: true,
                  })
                : card;
            return (
              <div
                key={i}
                data-testid={`paths-card-slide-${i + 1}`}
                className="w-[70vw] max-w-[300px] shrink-0"
                style={{
                  scrollSnapAlign: "start",
                  scrollSnapStop: "always",
                }}
              >
                {renderedCard}
              </div>
            );
          })}
        </div>
      </div>

      {/*
       * Pagination dots — single strongest visual signal that there
       * are N cards and the user is on card K. Tappable so the user
       * can jump directly to any card without swiping. The text
       * "swipe to explore" hint is gone now that the dots speak for
       * themselves and to save vertical space (the page was scrolling
       * further than expected on mobile, partly because of paddings
       * like this one stacking up below an already tall section).
       */}
      <div
        className="mt-3 flex items-center justify-center gap-2"
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
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FlyInCard — shared per-card cinematic 3D entrance                 */
/* ------------------------------------------------------------------ */

/**
 * Wraps each card with a 3D fly-in entrance. Initial state has the
 * card lifted 80 px below, scaled to 85 %, rotated 18° on the X axis
 * (perspective is supplied by the parent grid section). The entrance
 * fires whenever 15 % of the card is in view — `once: false`, so it
 * REPLAYS when the user scrolls past it and returns. Index-based 120
 * ms stagger keeps adjacent cards from popping in lockstep.
 */
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
  // Mobile entrance: simple 2D fade + lift. The desktop version
  // adds scale and a 3D rotateX which costs the GPU a per-frame
  // matrix3d composite; on phones the visual gain is invisible
  // but the cost is real, so mobile gets a flat 2D entrance.
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
