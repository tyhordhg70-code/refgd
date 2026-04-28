"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * PathsHorizontalReveal — mobile path-card layout.
 *
 * Mobile (< 768px): a native CSS scroll-snap horizontal carousel.
 *   • All five cards are always in the DOM, side by side.
 *   • The OS handles scrolling natively — one swipe = one card,
 *     iOS / Android inertia behaves exactly as users expect.
 *   • Card 1 is the first item the user sees, card 5 is the last
 *     and is reachable with simple horizontal swipes.
 *   • Pagination dots reflect the current card so the user knows
 *     there are more cards to swipe to.
 *
 * Replaces an earlier scroll-jacking ("camera tracks sideways"
 * with sticky 5×100svh runway). That was cinematic on paper but
 * combined badly with mobile inertial scroll: a fast flick blew
 * past several cards, the spring lagged, and cards 1 and 5 were
 * effectively invisible. The native carousel ships with
 * predictable touch handling.
 *
 * Desktop / tablet (≥ 768px): unchanged — render `desktopFallback`,
 * which is the existing 1 / 2 / 3 / 5-column grid on the home page.
 */
export default function PathsHorizontalReveal({
  cards,
  desktopFallback,
}: {
  /** Pre-built card React nodes, in order. */
  cards: ReactNode[];
  /** What to render on tablet / desktop. Typically the existing grid. */
  desktopFallback: ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Track which card is currently snapped — used to drive the
  // pagination dots underneath the carousel. We compute the
  // closest snap target by inspecting scrollLeft against each
  // child's offsetLeft + width / 2.
  useEffect(() => {
    if (!isMobile) return;
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const items = Array.from(track.children) as HTMLElement[];
        if (items.length === 0) return;
        const center = track.scrollLeft + track.clientWidth / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < items.length; i++) {
          const c = items[i];
          const itemCenter = c.offsetLeft + c.offsetWidth / 2;
          const dist = Math.abs(itemCenter - center);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        setActiveIndex(bestIdx);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile, cards.length]);

  const scrollToCard = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const items = Array.from(track.children) as HTMLElement[];
    const target = items[i];
    if (!target) return;
    const left =
      target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2;
    track.scrollTo({ left, behavior: "smooth" });
  };

  // SSR / desktop / tablet: render the existing desktop grid.
  if (!mounted || !isMobile) {
    return <>{desktopFallback}</>;
  }

  return (
    <div data-testid="paths-mobile-carousel" className="relative">
      {/* Carousel track. Bleed to the screen edges via negative
          margin so cards can sit in the centre with a peek of the
          next/previous card on either side. `pl-6 pr-6` adds the
          inset gutter; `snap-mandatory` snaps each card to centre. */}
      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-6 pb-4 [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // pan-x AND pan-y so vertical scrolls flow up to the page
          // (we only intercept horizontal swipes for the carousel).
          touchAction: "pan-x pan-y",
          scrollSnapType: "x mandatory",
        }}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            data-testid={`paths-card-slot-${i}`}
            className="w-[85vw] max-w-[24rem] shrink-0 snap-center"
            style={{ scrollSnapAlign: "center" }}
          >
            {card}
          </div>
        ))}
      </div>

      {/* Pagination dots — tappable, also signals there are more
          cards to scroll to (which fixes the perception that "card
          5 doesn't exist" because users couldn't reach it before). */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {cards.map((_, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Show card ${i + 1}`}
              onClick={() => scrollToCard(i)}
              className="group p-2"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  active
                    ? "h-2 w-6 bg-amber-300"
                    : "h-2 w-2 bg-white/30 group-hover:bg-white/55"
                }`}
                style={
                  active
                    ? { boxShadow: "0 0 14px rgba(255,237,180,0.85)" }
                    : undefined
                }
              />
            </button>
          );
        })}
      </div>

      {/* Swipe hint — fades out the moment the user starts scrolling. */}
      <p
        className={`heading-display mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-white/55 transition-opacity duration-500 ${
          activeIndex === 0 ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      >
        ‹ swipe ›
      </p>
    </div>
  );
}
