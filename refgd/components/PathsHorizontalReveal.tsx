"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
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
      {/* Ambient floating orbs — CSS-animation-driven, never touch swiper state */}
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
const FLOAT_ORB_CONFIG = [
  { size: 80, left: "4%",  top: "2%",   color: "rgba(245,185,69,0.22)",  blur: 28, drift: 16, o: [0.35, 0.80] as const, dur: 4.2, delay: 0   },
  { size: 48, left: "82%", top: "4%",   color: "rgba(167,139,250,0.28)", blur: 20, drift: 12, o: [0.30, 0.75] as const, dur: 5.0, delay: 0.9 },
  { size: 56, left: "6%",  top: "74%",  color: "rgba(34,211,238,0.20)",  blur: 24, drift: 18, o: [0.28, 0.72] as const, dur: 4.6, delay: 1.5 },
  { size: 36, left: "80%", top: "78%",  color: "rgba(240,171,252,0.24)", blur: 16, drift: 10, o: [0.35, 0.78] as const, dur: 3.8, delay: 2.1 },
  { size: 28, left: "50%", top: "-2%",  color: "rgba(255,255,255,0.12)", blur: 12, drift:  8, o: [0.20, 0.55] as const, dur: 6.0, delay: 1.0 },
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
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.left,
            top: orb.top,
            background: orb.color,
            filter: `blur(${orb.blur}px)`,
            willChange: "transform, opacity",
          }}
          animate={{
            y: [0, -orb.drift, 0, orb.drift * 0.4, 0],
            x: [0, orb.drift * 0.3, 0, -orb.drift * 0.2, 0],
            opacity: [orb.o[0], orb.o[1], orb.o[0], orb.o[1], orb.o[0]],
          }}
          transition={{
            duration: orb.dur,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
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
  return (
    <motion.div
      data-testid="paths-mobile-track"
      className="mx-auto"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
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
        speed={550}
        cubeEffect={{
          shadow: false,
          slideShadows: false,
          shadowOffset: 24,
          shadowScale: 0.92,
        }}
        pagination={{ clickable: true }}
        className="h-full w-full"
      >
        {cards.map((card, i) => {
          const renderedCard = isValidElement(card)
            ? cloneElement(card as ReactElement<{ noReveal?: boolean }>, {
                noReveal: true,
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
    </motion.div>
  );
}
