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
import { EffectCube, Pagination } from "swiper/modules";
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
 * Wraps Swiper with EffectCube + Pagination modules. Each slide
 * is one path card, rendered in noReveal mode (flat, no extra
 * motion wrappers). The cube container is sized to the viewport
 * minus side padding; cubeEffect.shadow=true adds a soft floor
 * shadow that reads as the cube sitting on a surface.
 */
function SwiperCubeStage({ cards }: { cards: ReactNode[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Capture-phase vertical-scroll release ──────────────────────
  // touchAngle: 12 in the Swiper config below already tells Swiper
  // to ignore vertical-leaning gestures, but on iOS Safari Swiper's
  // touchmove handler still consumes the gesture for ~5-10 px
  // before it gives up — long enough for the user to feel "the
  // cube ate my scroll". To eliminate that perceived lock entirely
  // we attach our OWN capture-phase listeners on the cube wrapper
  // and call `stopImmediatePropagation()` on the touchmove BEFORE
  // Swiper's bubble-phase listeners run. Swiper never receives the
  // event, so the browser's native pan-y scroll takes over from
  // the very first millimeter of vertical motion.
  //
  // Threshold: a gesture is classified as vertical the moment
  // |dy| > |dx| AND |dy| >= 4 px. Any horizontal-leaning gesture
  // (or near-zero motion = tap) flows through to Swiper untouched
  // and rotates the cube as before.
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
        // Already decided vertical — keep blocking Swiper for the
        // entire gesture so it can't latch on mid-swipe.
        e.stopImmediatePropagation();
        return;
      }
      if (ax + ay < 4) return;
      if (ay > ax) {
        decided = "v";
        e.stopImmediatePropagation();
      } else {
        decided = "h";
      }
    };
    const onEnd = () => {
      decided = null;
    };

    // capture: true puts our handlers BEFORE Swiper's listeners
    // (which are attached on inner .swiper-wrapper in bubble phase).
    // passive: true is fine — we never preventDefault, only
    // stopPropagation. The browser still owns the gesture for
    // pan-y scroll arbitration.
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
        effect="cube"
        modules={[EffectCube, Pagination]}
        loop
        grabCursor
        speed={520}
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
        // ── VERTICAL SCROLL PASS-THROUGH (the "can't scroll on mobile" fix) ──
        // Swiper's default touchStartPreventDefault:true calls
        // event.preventDefault() on touchstart, which KILLS the browser's
        // native vertical scrolling before our CSS `touch-action: pan-y`
        // ever gets a chance. The user reported "path cards can't scroll
        // on mobile" — they meant the entire page locked when their
        // finger landed on the cube. With this set to false the browser
        // owns the touch until Swiper's touchmove handler proves the
        // gesture is horizontal-enough (within touchAngle below) to
        // claim it.
        touchStartPreventDefault={false}
        // touchAngle (default 45): Swiper claims any drag within ±45° of
        // horizontal. ±28° was still too greedy — users on iOS Safari
        // and Android Chrome reported the page still locked when their
        // thumb landed on the cube. ±12° is intentionally extreme: only
        // a near-pure horizontal flick rotates the cube, and ANY
        // vertical-leaning gesture immediately falls through to the
        // browser's native page scroll. Combined with the CSS
        // `touch-action: pan-y` on the cube container, this makes
        // vertical scrolling feel instant.
        touchAngle={12}
        onSwiper={(s) => setActiveIndex(s.realIndex)}
        onSlideChange={(s) => setActiveIndex(s.realIndex)}
        // Cube depth — slideShadows give each face a subtle dark
        // sheen as it rotates away from the camera, which is what
        // sells the "this is a 3D cube" gesture. shadow draws the
        // soft floor shadow under the rotating cube. Both are
        // GPU-composited by Swiper (CSS transforms only) so they
        // cost nothing on the JS thread during the swipe.
        cubeEffect={{
          shadow: false,
          slideShadows: !isMobile,
          shadowOffset: 24,
          shadowScale: 0.92,
        }}
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
