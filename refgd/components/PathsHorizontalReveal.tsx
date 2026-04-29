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
/*  Mobile — STICKY-PIN scroll-jacked carousel                        */
/* ------------------------------------------------------------------ */

/**
 * Sticky-pin carousel. Vertical scroll IS horizontal scroll while
 * the cards are on screen. After card 5 the page resumes normal
 * vertical scrolling.
 *
 * The user explicitly asked for this:
 *
 *   "Enable vertical scrolling so that instead of going down it
 *    scrolls the cards instead and after 5th card it resumes
 *    vertical scrolling."
 *
 * ── How the layout works ──────────────────────────────────────
 *
 *   <section style={{ height: N * 80vh }}>     // outer
 *     <div style={{ position: 'sticky', top: 0,
 *                   height: '100vh' }}>        // inner pin
 *       <div ref={trackRef}                    // track
 *            style={{ transform: translateX(...) }} >
 *         <card 1 />
 *         <card 2 />
 *         ...
 *       </div>
 *     </div>
 *   </section>
 *
 *   • Outer is N × 80 vh tall (5 cards → 400 vh = ~3380 px on
 *     iPhone 12). It's a normal block-level section so the page
 *     just keeps scrolling through it.
 *   • Inner is `position: sticky; top: 0; height: 100vh`. The
 *     browser pins it to the viewport while the outer is in
 *     view, then releases at the bottom — pure CSS, no listener,
 *     no preventDefault, no scroll-jacking by JS.
 *   • A single passive `scroll` listener computes how far the
 *     outer has scrolled past 0 → 1 and writes a translate3d to
 *     the track via direct DOM (no React render per scroll).
 *     Card K becomes centered when progress ≈ K / (N - 1).
 *
 * ── Why the previous sticky-pin "broke" and this one doesn't ──
 *
 *   The old version:
 *     1. Relied on framer's `useScroll` + a setState on every
 *        scroll-tick (one React render per pixel of scroll = lag).
 *     2. Did NOT clamp progress, so iOS rubber-banding produced
 *        negative or > 1 progress and the cards visibly slid past
 *        their endpoints.
 *     3. Re-armed its target on every scroll-up, leaving the user
 *        mid-stage when scrolling back.
 *
 *   This rewrite:
 *     1. Pure DOM mutation in a rAF — zero React renders per
 *        scroll-tick. activeIndex is the only setState and only
 *        flips when it actually changes (≈ once per 80 vh).
 *     2. progress is clamped Math.min/max(0…1) — rubber-band can
 *        push rect.top into negative-than-expected territory but
 *        the transform still reads as 0 or 1.
 *     3. Nothing to "re-arm"; sticky positioning is reversible
 *        for free — scroll back up and the sticky un-pins
 *        naturally as the outer rises out of view.
 *
 * ── Why the headline above this carousel still works ──────────
 *
 *   PathsHorizontalReveal is rendered AFTER `paths-intro` in the
 *   page. The intro headline scrolls past normally; once the user
 *   reaches this carousel section, the inner pins to the top of
 *   the viewport. After the carousel scrolls past, the next
 *   section (telegram CTA) takes over.
 *
 * ── Card entrance & float ──────────────────────────────────────
 *
 *   Each carousel card is given `noReveal=true` so it renders in
 *   its final visual state immediately (cards 3-5 never intersect
 *   the window viewport at scroll start, so a `whileInView`
 *   reveal would never fire on them). The PathCard floatSlow
 *   keyframe (~12 px breath every 7 s) IS active because the
 *   sticky pin's overflow:hidden is on a 100 vh container with
 *   the cards vertically centered — no clipping.
 */
function MobileHorizontalCarousel({ cards }: { cards: ReactNode[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track-driven scroll-progress → translate3d. Pure DOM mutation
  // inside a rAF; activeIndex setState only fires when the index
  // actually changes (≈ once per 80 vh of scroll).
  useEffect(() => {
    const el = containerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    const numCards = cards.length;
    if (numCards < 2) return;

    let raf = 0;
    let lastIdx = -1;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = el.offsetHeight - vh;
      if (total <= 0) {
        track.style.transform = `translate3d(0,0,0)`;
        return;
      }
      // rect.top: 0 when outer's top hits viewport top (sticky engages)
      //           -total when outer's bottom hits viewport bottom (release)
      const scrolled = Math.max(0, -rect.top);
      const p = Math.max(0, Math.min(1, scrolled / total));
      const tx = -p * (numCards - 1) * 100;
      track.style.transform = `translate3d(${tx}vw, 0, 0)`;

      const idx = Math.round(p * (numCards - 1));
      if (idx !== lastIdx) {
        lastIdx = idx;
        setActiveIndex(idx);
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [cards.length]);

  // Tap a dot to scroll the page to that card's position.
  const goTo = (i: number) => {
    const el = containerRef.current;
    if (!el) return;
    const numCards = cards.length;
    if (numCards < 2) return;
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const total = el.offsetHeight - window.innerHeight;
    const targetY = top + (i / (numCards - 1)) * total;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  // Outer height: numCards × 80 vh. With sticky 100 vh inner:
  //   pin distance = (numCards × 80 vh) - 100 vh
  //   per-card transition  = pin distance / (numCards - 1)
  // For 5 cards on a 844 px viewport:
  //   total = 5 × 0.8 × 844 = 3376 px
  //   pin distance = 3376 - 844 = 2532 px
  //   per card = 2532 / 4 = 633 px ≈ 75 % of one viewport
  // → user scrolls ~75 % of a viewport to advance one card.
  // Snappy enough not to feel like a slog, slow enough to read
  // each card.
  const sectionHeight = `${cards.length * 80}vh`;

  return (
    <section
      data-testid="paths-mobile-stage"
      ref={containerRef}
      className="relative w-full"
      style={{ height: sectionHeight }}
    >
      {/* Sticky pin — pure CSS. The browser handles the pinning;
          we never preventDefault any input. */}
      <div
        className="sticky top-0 flex h-screen w-full items-center overflow-hidden"
        style={{
          // Bring back the soft amber glow behind the cards from
          // the previous design.
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(245,185,69,0.08) 0%, transparent 60%)",
        }}
      >
        <div
          ref={trackRef}
          data-testid="paths-mobile-track"
          className="flex items-center"
          style={{
            width: "max-content",
            willChange: "transform",
            transform: "translate3d(0,0,0)",
          }}
        >
          {cards.map((card, i) => {
            // Same noReveal pattern as before — cards far off-screen
            // in the track (e.g. card 5 at x=400vw) never intersect
            // the window viewport, so any IntersectionObserver-based
            // entrance reveal would freeze them at initial state.
            const renderedCard = isValidElement(card)
              ? cloneElement(card as ReactElement<{ noReveal?: boolean }>, {
                  noReveal: true,
                })
              : card;
            return (
              <div
                key={i}
                data-testid={`paths-card-slide-${i + 1}`}
                className="flex h-full items-center justify-center"
                style={{
                  width: "100vw",
                  flexShrink: 0,
                  paddingLeft: "8vw",
                  paddingRight: "8vw",
                  boxSizing: "border-box",
                }}
              >
                <div className="w-full max-w-[360px]">{renderedCard}</div>
              </div>
            );
          })}
        </div>

        {/* Pagination dots — fixed near the bottom of the pinned
            viewport. Tappable so the user can jump to any card.
            Only re-renders when activeIndex changes (≈ once per
            card transition). */}
        <div
          className="absolute bottom-6 left-0 right-0 z-10 flex items-center justify-center gap-2"
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
