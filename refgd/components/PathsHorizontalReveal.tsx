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
 *   • Mobile (< 768px): a 3D-CUBE paged carousel.
 *     Each card occupies one face of a cube. Vertical scroll
 *     attempts (wheel / touch) AND horizontal touch swipes both
 *     advance the cube by exactly ONE card per discrete gesture.
 *     The component itself only takes 100 vh of layout — there's
 *     NO 4× viewport-tall scroll buffer underneath the carousel,
 *     so the page can never "overshoot" past the telegram CTA.
 *
 *     • One-scroll-one-card  — wheel and touch are debounced
 *       so a single deliberate flick = one cube face turn, even
 *       on a hard fling. No accidental double-skips.
 *     • 3D cube transition   — the cube rotates 90° between cards
 *       with `transform-style: preserve-3d`; cards mount once and
 *       stay mounted (only the cube's rotation changes), so there
 *       is no remount flicker mid-spin.
 *     • Edge release         — when the user is on the last card
 *       and continues to scroll/swipe down, the carousel releases
 *       and lets the page scroll naturally to the next section
 *       (telegram CTA). Same on the first card scrolling up. No
 *       skipping past telegram, no being trapped on card 5.
 *     • Native horizontal swipe — left/right swipes also advance
 *       cards, with the same single-step debounce.
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

  return <MobileCubeCarousel cards={cards} />;
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
/*  Mobile — 3D CUBE PAGED CAROUSEL                                   */
/* ------------------------------------------------------------------ */

/**
 * Mobile carousel — 3D cube with one card per face, paged
 * advancement.
 *
 * ── Layout (no scroll buffer, no overshoot) ───────────────────
 *
 *   <section style={{ height: '100vh' }}>            // outer
 *     <div className="sticky top-0 h-screen">        // pin
 *       <div ref={cubeRef} className="cube">         // 3D cube
 *         <div className="face">card 1</div>         // 5 faces
 *         <div className="face">card 2</div>
 *         …
 *       </div>
 *     </div>
 *   </section>
 *
 *   • Outer is exactly 100 vh tall. No 400 vh scroll buffer like
 *     the previous sticky-pin design. When the carousel is done,
 *     the very next section (telegram CTA) sits immediately
 *     below in the layout — there's no empty page between them
 *     for momentum to skip through.
 *   • The page only "pauses" while the user is interacting with
 *     the carousel — accomplished by an event-level lock (wheel
 *     and touchmove preventDefault) NOT a layout-level scroll
 *     buffer. When the user reaches the last card and continues
 *     to scroll down, the lock releases and the page scrolls
 *     normally to telegram.
 *
 * ── Why a cube, not a slide ───────────────────────────────────
 *
 *   • Single transform changes between cards (rotateY on the
 *     cube container) — cards mount once and never remount. The
 *     previous slide-track approach kept all 5 cards mounted but
 *     they each lived inside a track that translated on every
 *     scroll-tick — causing per-frame layout work that flickered
 *     on slow phones. A cube needs ONE transform per face
 *     change, period.
 *   • The 3D effect was an explicit user request and reads as
 *     much more intentional than a flat slide.
 *
 * ── One-scroll-one-card ───────────────────────────────────────
 *
 *   • A single discrete gesture = one cube turn. After advancing
 *     the index, we set a 700 ms cooldown during which further
 *     wheel/touch deltas are absorbed (still preventDefault'd
 *     so the page doesn't lurch) but ignored.
 *   • Wheel: each `wheel` event with |deltaY| > 4 advances by 1
 *     and starts the cooldown. Subsequent events during cooldown
 *     are absorbed.
 *   • Touch: track touchstart, then on touchend if the dominant
 *     delta exceeds the threshold (40 px) advance by 1.
 *   • Horizontal swipe: same threshold, axis is whichever
 *     dimension has the larger absolute delta. Right→prev,
 *     left→next, down→next, up→prev.
 *
 * ── Edge release & telegram alignment ─────────────────────────
 *
 *   • currentIndex == numCards-1 + scroll/swipe-down → release.
 *   • currentIndex == 0           + scroll/swipe-up   → release.
 *   • Release means: do NOT preventDefault that wheel/touch
 *     event, let the browser scroll the page to the next/prev
 *     section. No teleport, no jump — the carousel section is
 *     exactly 100 vh, so the next 100 vh of scroll lands the
 *     user on the next section.
 */
function MobileCubeCarousel({ cards }: { cards: ReactNode[] }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const cooldownRef = useRef(0);
  const lockedRef = useRef(false);
  // The page-Y where the carousel section starts. Captured every
  // time we lock so we can pin scroll exactly there while turning
  // cards.
  const sectionTopRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(
    null,
  );

  const numCards = cards.length;

  // Keep ref synced for use in event listeners (which capture
  // closures over their initial values).
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Lock detection: ratio >= 0.3 (rather than 0.6) so the lock
  // engages as soon as the section enters viewport prominently
  // and stays engaged even as its top edge inches off-screen.
  // We then pin scroll to sectionTop while consuming wheel events
  // — the section stays exactly aligned with the viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const recomputeTop = () => {
      const r = el.getBoundingClientRect();
      sectionTopRef.current = Math.round(r.top + window.scrollY);
    };
    recomputeTop();
    window.addEventListener("resize", recomputeTop);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const wasLocked = lockedRef.current;
          lockedRef.current = entry.intersectionRatio >= 0.3;
          if (lockedRef.current && !wasLocked) {
            recomputeTop();
          }
        }
      },
      { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1] },
    );
    io.observe(el);
    return () => {
      window.removeEventListener("resize", recomputeTop);
      io.disconnect();
    };
  }, []);

  const advance = useCallback(
    (dir: 1 | -1): boolean => {
      // Returns true if the gesture was consumed (= lock should
      // intercept the input). Returns false if the carousel is
      // at an edge and the gesture should pass through to the
      // page (= release).
      const now = performance.now();
      if (now < cooldownRef.current) {
        // Inside cooldown — consume but don't advance. This
        // absorbs trackpad inertia / iOS touch-momentum so a
        // single user gesture really is a single card turn.
        return true;
      }
      const idx = activeIndexRef.current;
      const next = idx + dir;
      if (next < 0 || next >= numCards) {
        // Edge: release.
        return false;
      }
      activeIndexRef.current = next;
      setActiveIndex(next);
      cooldownRef.current = now + 700;
      return true;
    },
    [numCards],
  );

  // Wheel listener — non-passive so we can preventDefault and
  // hold the page still while turning cube faces. Critically, we
  // also pin the body's scrollY back to the section's top after
  // each consumed wheel event. Without this pin, fast wheel
  // bursts can drag the section past the lock threshold before
  // the IntersectionObserver re-fires, breaking subsequent
  // advances.
  useEffect(() => {
    function pinScroll() {
      if (Math.abs(window.scrollY - sectionTopRef.current) > 1) {
        window.scrollTo(0, sectionTopRef.current);
      }
    }
    function onWheel(e: WheelEvent) {
      if (!lockedRef.current) return;
      // Tiny wheel events are usually trackpad inertia tail —
      // treat them as belonging to the previous gesture. If we
      // get one outside cooldown, threshold of 4 px filters out
      // sub-pixel inertia ticks.
      const dy = e.deltaY;
      if (Math.abs(dy) < 4) return;
      const dir: 1 | -1 = dy > 0 ? 1 : -1;
      const consumed = advance(dir);
      if (consumed) {
        e.preventDefault();
        // Re-pin to absorb any momentum scroll that already
        // queued up before this handler ran.
        pinScroll();
      } else {
        // Edge release. We DO preventDefault and place the user
        // exactly at the next/previous section ourselves. This
        // matters because a fast wheel burst (deltaY in the
        // thousands) would otherwise scroll the page far past
        // the adjacent section — on the down-edge, that means
        // the user blows straight past the telegram box and
        // lands at the footer.
        e.preventDefault();
        const nextTop =
          dir === 1
            ? sectionTopRef.current + window.innerHeight
            : Math.max(0, sectionTopRef.current - window.innerHeight);
        window.scrollTo({ top: nextTop, behavior: "smooth" });
      }
    }
    // `passive: false` is required to call preventDefault on wheel.
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
    };
  }, [advance]);

  // Touch listeners — track start, intercept move only when
  // appropriate, decide on end.
  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (!lockedRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      touchStartRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
    }

    function onTouchMove(e: TouchEvent) {
      if (!lockedRef.current) return;
      const start = touchStartRef.current;
      if (!start) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      // Decide axis once the gesture has moved a few pixels.
      if (adx < 6 && ady < 6) return;
      // Vertical-dominant gesture
      const idx = activeIndexRef.current;
      const dirVertical: 1 | -1 = dy < 0 ? 1 : -1; // swipe up = next
      const dirHorizontal: 1 | -1 = dx < 0 ? 1 : -1; // swipe left = next
      const wantDir = ady > adx ? dirVertical : dirHorizontal;
      const next = idx + wantDir;
      // If we're at an edge and the user is swiping toward release,
      // do NOT preventDefault — let the page scroll.
      if (next < 0 || next >= numCards) {
        // Only release for vertical gestures. Horizontal at edge
        // we still preventDefault so the page doesn't sideways-
        // pan into the wrong section.
        if (ady > adx) return; // vertical → release
        e.preventDefault();
        return;
      }
      // Otherwise we WILL consume this gesture on touchend, so
      // start by holding the page still during the move.
      e.preventDefault();
    }

    function onTouchEnd(e: TouchEvent) {
      if (!lockedRef.current) return;
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const THRESHOLD = 40;
      if (adx < THRESHOLD && ady < THRESHOLD) return;
      const dirVertical: 1 | -1 = dy < 0 ? 1 : -1;
      const dirHorizontal: 1 | -1 = dx < 0 ? 1 : -1;
      const dir = ady > adx ? dirVertical : dirHorizontal;
      advance(dir);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [advance, numCards]);

  // Tap a dot to jump.
  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= numCards) return;
    activeIndexRef.current = i;
    setActiveIndex(i);
    cooldownRef.current = performance.now() + 500;
  }, [numCards]);

  // ── 3D card-flip geometry ─────────────────────────────────────
  //
  // We use a stacked-card "3D flip" approach instead of a literal
  // 4- or 5-faced cube prism, for two reasons:
  //
  //   (a) An N-faced prism with N != 4 either requires fractional
  //       face rotations (72° for 5 cards, breaking the "cube"
  //       feel) OR causes face-0 and face-N to overlap when N
  //       isn't a divisor of 360.
  //   (b) In a literal cube, 4 of the 5 cards sit at oblique
  //       angles to the camera at any given moment — they project
  //       as compressed parallelograms which read as broken
  //       layouts on a phone.
  //
  // The flip approach keeps every card flat to the camera at all
  // times. Cards are stacked on top of each other in a 3D scene
  // with their own per-card transform:
  //
  //   • i  < activeIndex  → rotateY( -90°), translateZ(-150 px),  opacity 0
  //   • i == activeIndex  → rotateY(   0°), translateZ(   0  ),   opacity 1
  //   • i  > activeIndex  → rotateY( +90°), translateZ(-150 px),  opacity 0
  //
  // Going from card 2 → 3, card 2 flips out (rotateY 0 → -90°,
  // sliding back into depth) while card 3 flips in (rotateY 90° →
  // 0°, swinging from off-camera right). Both transforms run on
  // CSS transitions so the GPU handles every frame; no JS per-
  // frame work, no remounts (cards mount once and stay mounted),
  // no flickering.

  const cardWidth = "min(84vw, 360px)";
  const cardHeight = "min(112vw, 480px)";

  return (
    <section
      data-testid="paths-mobile-stage"
      ref={sectionRef}
      className="relative w-full"
      style={{
        height: "100vh",
        // Prevent vertical overscroll on this section from
        // chaining up into adjacent sections.
        overscrollBehavior: "contain",
      }}
    >
      <div
        className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(245,185,69,0.08) 0%, transparent 60%)",
          perspective: "1600px",
        }}
      >
        {/* 3D CARD-FLIP STACK — every card sits at the same X/Y
            slot but at a different rotateY/translateZ depending on
            its position relative to activeIndex. CSS transition
            handles the in-between frames; no per-frame JS work. */}
        <div
          data-testid="paths-cube-container"
          className="relative grid place-items-center"
          style={{
            width: cardWidth,
            height: cardHeight,
            transformStyle: "preserve-3d",
          }}
        >
          {cards.map((card, i) => {
            const renderedCard = isValidElement(card)
              ? cloneElement(card as ReactElement<{ noReveal?: boolean }>, {
                  noReveal: true,
                })
              : card;
            const offset = i - activeIndex;
            // Off-screen cards sit at +/- 90° and ~150 px deeper so
            // the flip reads as a real 3D rotation, not a flat
            // crossfade. Faded to opacity 0 while the rotation
            // happens — this also stops far cards from briefly
            // appearing as the active card flips past them.
            const rotateY = offset === 0 ? 0 : offset > 0 ? 90 : -90;
            const translateZ = offset === 0 ? 0 : -160;
            const opacity = offset === 0 ? 1 : 0;
            const pointerEvents = offset === 0 ? "auto" : "none";
            return (
              <div
                key={i}
                data-testid={`paths-card-face-${i + 1}`}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
                  transformOrigin: "center center",
                  opacity,
                  pointerEvents,
                  transition:
                    "transform 700ms cubic-bezier(0.65, 0, 0.35, 1)," +
                    "opacity 500ms ease",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  willChange: "transform, opacity",
                }}
              >
                <div className="w-full">{renderedCard}</div>
              </div>
            );
          })}
        </div>

        {/* Hint above the dots — clarifies the interaction model
            on first encounter. Fades after the user's first
            advance. */}
        <p
          aria-hidden="true"
          className={`absolute bottom-16 z-10 heading-display text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-white/60 transition-opacity duration-500 ${
            activeIndex === 0 ? "opacity-100" : "opacity-0"
          }`}
        >
          Scroll or swipe to turn
        </p>

        {/* Pagination dots — fixed near the bottom. Tap to jump. */}
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
