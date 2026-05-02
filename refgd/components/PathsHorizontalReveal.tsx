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
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, EffectCube } from "swiper/modules";
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
      className="relative mx-auto w-full py-2"
      style={{ perspective: "1600px" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <motion.div
        className="relative px-2 sm:px-4"
        initial={{ opacity: 1, y: 0 }}
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
        <p className="heading-display mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.38em] text-white/55 sm:text-xs">
          Choose your door
        </p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile — NATIVE HORIZONTAL SCROLL-SNAP CAROUSEL                   */
/*  ABSOLUTELY FLAT cards. ZERO transitions during swipe. Native only.*/
/* ------------------------------------------------------------------ */

/* Why no card animation at all on mobile?
 *
 * The user's last report: "Path cards still laggy and cut off both
 * directions swipe." The previous iteration ran a CSS transition
 * (scale/opacity) on the active class flip. The transition lasted
 * 280 ms — but the snap-scroll itself also takes ~250-400 ms. So
 * during the snap, the leaving card was scaling DOWN from 1.0 to
 * 0.92 while the arriving card was scaling UP from 0.92 to 1.0,
 * and BOTH were partially visible at the viewport edge (because
 * the next card peeks ~8 vw past the snap point). Visually that
 * reads as "two half-sized, half-faded cards drifting across the
 * screen", which the user experienced as cards being "cut off
 * and broken" mid-swipe.
 *
 * The bullet-proof fix: don't animate the cards at all on
 * mobile. Cards stay at scale(1) opacity(1) for their entire
 * lifetime. The browser does pure native scroll-snap with zero
 * CSS transitions on the slide elements — no in-flight visual
 * interpolation can happen, so nothing can look broken. The
 * "which card is active" feedback is provided exclusively by
 * the pagination dots at the bottom of the carousel. */
/* Mobile carousel — Swiper 11 with the 3D CUBE effect.
 *
 * Why Swiper instead of native scroll-snap?
 *
 *   • The user explicitly asked for a 3D cube animation when
 *     swiping between cards. Native horizontal scroll-snap
 *     can't render that; you'd have to compute per-frame
 *     transforms in JS, which is exactly what was causing the
 *     "laggy / distorted / cut off mid-swipe" reports earlier.
 *
 *   • Swiper renders the cube faces with pre-baked CSS 3D
 *     transforms that the browser composites entirely on the
 *     GPU thread. There is no per-frame JS work during the
 *     swipe — the touch position drives a single transform on
 *     the cube container, and each face stays at a fixed
 *     orientation relative to that container. This is the
 *     same technique used by Apple's first-party iOS UIs.
 *
 *   • At rest exactly ONE card face is visible, filling the
 *     viewport edge-to-edge. There is no neighbour-peek and
 *     therefore no "card cut off at the edge" issue.
 *
 *   • Swiper handles touch gestures natively with iOS-grade
 *     deceleration, snap, and rubber-band — battle-tested on
 *     hundreds of millions of phones. */
function MobileSnapCarousel({ cards }: { cards: ReactNode[] }) {
  return (
    <section
      data-testid="paths-mobile-carousel"
      className="relative w-full overflow-hidden py-4"
    >
      {/* Ambient floating orbs — pure CSS keyframes, zero JS cost during swipe */}
      <MobileFloatOrbs />
      <SwiperCubeStage cards={cards} />
      <p
        aria-hidden="true"
        className="mt-4 heading-display text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-white/55"
      >
        Swipe to rotate the cube
      </p>
    </section>
  );
}


/* ── MobileFloatOrbs ─────────────────────────────────────────────────────────
 * Pure framer-motion looping animations — zero per-frame JS during Swiper
 * swipe gestures. Each orb is positioned at a fixed spot outside the cube
 * bounding box and animates independently, so the Swiper compositor never
 * competes with these layers.
 */
// Three orbs (was five). Each orb is a filter:blur() compositor
// layer; on mobile the layer cost outweighs the visual impact of
// the smaller accent orbs, so we keep only the three biggest /
// most colour-distinct ones. The ambient "floating light" feel
// is preserved with measurable scroll-budget savings.
const FLOAT_ORB_CONFIG = [
  { size: 80, left: "4%",  top: "2%",   color: "rgba(245,185,69,0.22)",  blur: 28, drift: 16, o: [0.35, 0.80] as const, dur: 4.2, delay: 0   },
  { size: 56, left: "82%", top: "4%",   color: "rgba(167,139,250,0.28)", blur: 22, drift: 12, o: [0.30, 0.75] as const, dur: 5.0, delay: 0.9 },
  { size: 60, left: "6%",  top: "74%",  color: "rgba(34,211,238,0.20)",  blur: 24, drift: 18, o: [0.28, 0.72] as const, dur: 4.6, delay: 1.5 },
];

function MobileFloatOrbs() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {FLOAT_ORB_CONFIG.map((orb, i) => (
        <div
          key={i}
          className="float-orb absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.left,
            top: orb.top,
            background: orb.color,
            animationDuration: `${orb.dur}s`,
            animationDelay: `${orb.delay}s`,
            // Per-orb keyframe variables (read by the .float-orb @keyframes
            // in globals.css). Drift signs alternate so each orb travels in
            // a slightly different orbit.
            ["--orb-min" as any]: orb.o[0],
            ["--orb-max" as any]: orb.o[1],
            ["--orb-dy-up" as any]: `${-orb.drift}px`,
            ["--orb-dy-down" as any]: `${orb.drift * 0.4}px`,
            ["--orb-dx" as any]: `${orb.drift * 0.3}px`,
            ["--orb-dx-neg" as any]: `${-orb.drift * 0.2}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── SwiperCubeStage ─────────────────────────────────────────────
 * v6.10 (2026-05): switched from EffectCube to EffectCards.
 *
 * Why: a Swiper cube has only FOUR rotatable side faces (it's a
 * cube). The home page now has FIVE path cards (Refund Store List,
 * Evade Cancelations, Exclusive Mentorships, Shop Methods, BUY 4
 * YOU). With 5 slides on a 4-face cube, Swiper could rotate to
 * cards 1 and 2 but physically had nowhere to put cards 3-5 — the
 * cube would refuse to advance past slide 2 and the user reported
 * exactly that ("can't scroll past card 2") plus "illustrations
 * gone" (the unreachable cards 3-5 contained the illustrations
 * the user expected to swipe to).
 *
 * EffectCards (Swiper's stacked-deck effect) supports an
 * arbitrary number of slides — they sit in a tactile card stack
 * and the top card swipes off to reveal the next. The user can
 * cycle through all 5 path cards with no face-count limit. The
 * effect is GPU-only (CSS transforms) so the per-frame cost is
 * the same as the cube was.
 */
function SwiperCubeStage({ cards }: { cards: ReactNode[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Capture-phase vertical-scroll release ──────────────────────
  // Even with `touchAngle: 30` set on Swiper below, on iOS Safari
  // Swiper's bubble-phase touchmove handler still consumes the
  // first ~5-10 px of any gesture before its own angle filter
  // kicks in. That ate enough of a real horizontal flick that the
  // cube couldn't commit past slide 2 — Swiper would see the
  // first chunk of the gesture, partially rotate, then end the
  // touch before reaching its `longSwipesRatio` threshold.
  //
  // Fix: attach our own capture-phase touchstart/touchmove on the
  // cube wrapper. We classify a gesture as vertical ONLY when:
  //   • total motion ≥ 12 px (avoid jitter), AND
  //   • |dy| > |dx| × 1.7 (clearly vertical, not just slightly), AND
  //   • |dy| ≥ 10 px of vertical travel.
  // Anything else (every reasonable horizontal flick) flows
  // through to Swiper untouched and rotates the cube cleanly.
  // Vertical scrolls past the threshold release immediately via
  // stopImmediatePropagation, so the page's pan-y scroll wins.
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let decided: "h" | "v" | null = null;

    const onStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      decided = null;
    };
    const onMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      if (decided === "h") return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (decided === "v") {
        e.stopImmediatePropagation();
        return;
      }
      if (ax + ay < 12) return;
      if (ay > ax * 1.7 && ay >= 10) {
        decided = "v";
        e.stopImmediatePropagation();
      } else {
        decided = "h";
      }
    };
    const onEnd = () => {
      decided = null;
    };

    el.addEventListener("touchstart", onStart, { capture: true, passive: true });
    el.addEventListener("touchmove", onMove, { capture: true, passive: true });
    el.addEventListener("touchend", onEnd, { capture: true, passive: true });
    el.addEventListener("touchcancel", onEnd, { capture: true, passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart, { capture: true } as EventListenerOptions);
      el.removeEventListener("touchmove", onMove, { capture: true } as EventListenerOptions);
      el.removeEventListener("touchend", onEnd, { capture: true } as EventListenerOptions);
      el.removeEventListener("touchcancel", onEnd, { capture: true } as EventListenerOptions);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      data-testid="paths-mobile-track"
      className="cube-float mx-auto"
      style={{
        width: "min(92vw, 440px)",
        // Reserve a tall stage so the cube has room to rotate.
        // 1:1.42 aspect roughly matches the path-card aspect.
        aspectRatio: "1 / 1.42",
        // GPU layer for the whole stage; nothing outside is
        // affected by the cube's 3D context.
        transform: "translateZ(0)",
      }}
    >
      <Swiper
        // v6.10.7: EffectCube restored + loop=true.
        // EffectCube is the CORRECT effect for this stage — it is the
        // only effect where each SwiperSlide is sized to exactly fill
        // a cube face (= the stage dimensions) so the h-full chain
        // from SwiperSlide → PathCard → illustration always resolves
        // to a real pixel height. EffectCoverflow uses position:absolute
        // with height:auto on slides, which collapses h-full to 0 and
        // makes illustrations disappear.
        //
        // loop=true lets Swiper clone slides behind the scenes so the
        // cube always has all 4 faces populated regardless of slide
        // count — all 5 path cards are reachable with a single-finger
        // swipe, no 4-face hard cap in practice.
        modules={[Pagination, EffectCube]}
        effect="cube"
        cubeEffect={{
          shadow: false,
          slideShadows: false,
          shadowOffset: 0,
          shadowScale: 0,
        }}
        loop={true}
        grabCursor
        speed={520}
        // touchAngle: 30 — Swiper's own filter for vertical-leaning
        // gestures. Combined with our capture-phase listener above
        // this gives belt-and-braces release for vertical scrolls.
        touchAngle={30}
        // ── Touch sensitivity tuning ─────────────────────────────────
        // Default Swiper requires the user to drag past 50% of the
        // slide width (longSwipesRatio: 0.5) OR have ~300 ms+ of
        // velocity before a swipe commits to the next slide. With the
        // cube effect that means people had to drag almost the full
        // width of the card to rotate it — the user reported this as
        // "takes a really long swipe to change cards".
        //
        // The tuning below makes the cube respond like a normal mobile
        // carousel:
        //   • threshold:        ignore <6 px finger jitter (fixes
        //                       accidental "swipe" on tap).
        //   • touchRatio: 1.35  amplify finger movement so the cube
        //                       rotates ~35% faster than the finger.
        //                       The user feels like a small flick
        //                       moves the cube a meaningful amount.
        //   • longSwipesRatio:  commit on just 18% drag instead of
        //                       50% — a quick flick now reliably
        //                       lands on the next slide.
        //   • longSwipesMs:     250 ms (default 300) — slightly
        //                       faster long-swipe detection.
        //   • shortSwipes/      both true (default) so a fast flick
        //     followFinger:     also advances regardless of distance.
        //
        // None of these change the cube ANIMATION itself — the 3D
        // rotation still plays at full quality. They only change how
        // much input is needed to trigger it.
        threshold={6}
        touchRatio={1.35}
        longSwipesRatio={0.18}
        longSwipesMs={250}
        shortSwipes
        followFinger
        resistanceRatio={0.55}
        onSwiper={(s) => setActiveIndex(s.realIndex)}
        onSlideChange={(s) => setActiveIndex(s.realIndex)}
        pagination={{ clickable: true }}
        className="h-full w-full"
      >
        {cards.map((card, i) => {
          const renderedCard = isValidElement(card)
            ? cloneElement(card as ReactElement<{ noReveal?: boolean; animated?: boolean }>, {
                noReveal: true,
                // Only the currently visible slide gets live animations.
                // Others are frozen by PathIllustration's MotionConfig gate,
                // reducing concurrent framer-motion rAF callbacks from
                // ~125 (5 slides × 25 animations) to ~25 (1 active slide).
                animated: i === activeIndex,
              })
            : card;
          return (
            <SwiperSlide
              key={i}
              data-testid={`paths-mobile-slide-${i + 1}`}
              className="!h-full !w-full"
              style={{ borderRadius: 18, overflow: "hidden" }}
            >
              {renderedCard}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
