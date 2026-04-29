"use client";

import {
  useEffect,
  useState,
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
 *   The card entrance uses `viewport={{ once: false, amount: … }}`
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
        viewport={{ once: false, amount: 0.15 }}
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
  return (
    <section
      data-testid="paths-mobile-stage"
      className="relative w-full pb-4"
      style={{ perspective: "1400px" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-amber-300/10 blur-3xl" />

      {/*
       * The scroller.
       *
       * ── touch-action: pan-x ─────────────────────────────────────
       * Critical fix for the bug the user reported: on a touch
       * device, putting a finger down on this carousel would let the
       * browser claim the gesture for horizontal panning of the
       * scroller and the page's vertical scroll would be trapped —
       * the user could not swipe past the paths section. The
       * `touch-action: pan-x pinch-zoom` declaration (in the
       * `paths-mobile-scroller` class in globals.css) tells the
       * browser this scroller only handles horizontal pans (and
       * pinch zoom); vertical pans bubble up to the page and the
       * window scrolls normally.
       *
       * ── Centered cards ─────────────────────────────────────────
       * `scrollSnapAlign: "center"` snaps the active card to the
       * horizontal centre of the viewport. The lateral
       * `paddingInline` is sized so the FIRST and LAST cards can
       * also centre — without it the first card would always sit
       * jammed against the left edge.
       */}
      <div
        data-testid="paths-mobile-scroller"
        className="paths-mobile-scroller relative -mx-4 overflow-x-auto pb-4"
      >
        <div
          className="flex items-stretch gap-4"
          style={{
            width: "max-content",
            paddingInline: "max(1rem, calc((100vw - min(78vw, 340px)) / 2))",
          }}
        >
          {cards.map((card, i) => (
            <FlyInCard
              key={i}
              index={i}
              data-testid={`paths-card-slide-${i + 1}`}
              className="w-[78vw] max-w-[340px] shrink-0"
              style={{ scrollSnapAlign: "center" }}
            >
              {card}
            </FlyInCard>
          ))}
        </div>
      </div>

      {/* Subtle "swipe" hint — pure decoration, fades out on first interaction */}
      <p className="heading-display pointer-events-none mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.42em] text-white/55">
        ← swipe to explore →
      </p>
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
  className,
  style,
  ...rest
}: {
  children: ReactNode;
  index: number;
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
  return (
    <motion.div
      {...(rest as Record<string, unknown>)}
      className={className}
      initial={{ opacity: 0, y: 80, scale: 0.85, rotateX: 18 }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{
        duration: 0.95,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
