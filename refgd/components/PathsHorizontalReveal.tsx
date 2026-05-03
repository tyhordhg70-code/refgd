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
      <MobilePrismStage cards={cards} />
      <p
        aria-hidden="true"
        className="mt-4 heading-display text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-white/55"
      >
        Swipe or tap a dot to rotate
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

/* ── MobilePrismStage ────────────────────────────────────────────
 * v6.11 (2026-05): custom N-faced 3D prism, no Swiper.
 *
 * Every Swiper effect we tried failed for ≥1 of 4 reasons:
 *   • EffectCube              — hardcoded 4 faces; with 5 slides
 *                               cards 3-5 are unreachable.
 *   • EffectCube + loop=true  — clones slide DOM, duplicate SVG
 *                               ids → url(#…) refs broken →
 *                               illustrations disappear.
 *   • EffectCards             — flickering deck transition.
 *   • EffectCoverflow         — slides become position:absolute
 *                               with height:auto → h-full chain
 *                               collapses → illustrations gone.
 *   • EffectCreative          — adds backface-visibility:hidden
 *                               to slides + stacks all slides at
 *                               the same on-screen position; on
 *                               iOS Safari this hides child SVG
 *                               content unpredictably (a known
 *                               WebKit bug with backface-visibility
 *                               on a 3D-transformed parent of an
 *                               <svg>). Also: paint flickering on
 *                               rest from the layered transforms.
 *
 * This component renders a TRUE regular N-sided prism (here N=5)
 * using bare CSS 3D transforms, with no library involved:
 *
 *   • Each card is a "face" positioned via
 *     rotateY(i·θ) translateZ(r) where θ = 360°/N and r is the
 *     prism inradius computed from the live face width:
 *         r = W / (2·tan(π/N))
 *     So every face sits flush against its neighbours along the
 *     prism's lateral edges. For N=5, θ = 72°, r ≈ 0.688·W.
 *
 *   • The whole prism rotates by –(active+drag)·θ to bring face
 *     `active` to the front. The container is pulled back by
 *     translateZ(–r) so the active face lands at z=0 — i.e. at
 *     its natural display size, no perspective scaling.
 *
 *   • Touch gestures use pointer events with the same vertical-
 *     release rule the previous Swiper version had (|dy| > 1.7·|dx|
 *     and |dy| ≥ 10 → release the gesture so the document scroll
 *     wins). Releasing the touch snaps the prism via a 520 ms
 *     ease-out CSS transition.
 *
 *   • NO `backface-visibility: hidden`. Faces 2 and 3 (the back
 *     of the prism when face 0 is front) are naturally occluded
 *     by depth, no special hiding needed — and their child SVGs
 *     are guaranteed to render on iOS Safari.
 *
 *   • NO DOM cloning. Each card mounts exactly once, so SVG ids
 *     stay unique and gradient/filter url(#…) refs always
 *     resolve.
 *
 *   • The whole prism is wrapped in a framer-motion entrance
 *     reveal (initial opacity:0 / scale:0.85 → animate while in
 *     view) — the mobile carousel finally has the entrance
 *     animation that the desktop grid has always had.
 */
function MobilePrismStage({ cards }: { cards: ReactNode[] }) {
  const N = cards.length;
  const FACE_ANGLE = 360 / N;
  const reduced = useReducedMotion();

  const [active, setActive] = useState(0);
  // Drag fraction in units of one face. -1 = swiped fully right
  // (next face), +1 = swiped fully left (previous face). Reset to
  // 0 the moment the gesture ends.
  //
  // We MIRROR this in `dragRef` so finishGesture (called from a
  // pointerup handler that may fire in the same tick as the last
  // pointermove) reads the real latest value and not a stale one
  // from a not-yet-flushed React state update.
  const [drag, setDrag] = useState(0);
  const dragRef = useRef(0);
  const setDragBoth = (v: number) => { dragRef.current = v; setDrag(v); };

  const stageRef = useRef<HTMLDivElement>(null);
  const faceWidth = useRef(0);
  const faceDepth = useRef(0);

  // Recompute the prism inradius from the live face width. For a
  // regular N-gon with side W, the inradius (distance from centre
  // to side mid-point) is r = W / (2·tan(π/N)). We expose r as a
  // CSS variable so the face transforms can use it directly.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => {
      const w = stage.offsetWidth;
      faceWidth.current = w;
      const r = w / (2 * Math.tan(Math.PI / N));
      faceDepth.current = r;
      stage.style.setProperty("--face-depth", `${r}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [N]);

  // ── Pointer-event swipe handler with vertical-scroll release ──
  // Same release rule the old Swiper-based version used: a gesture
  // is treated as horizontal (= prism rotate) by default and only
  // released to the document's vertical scroll when the user has
  // moved ≥ 10 px vertically AND |dy| > 1.7·|dx|.
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const decided = useRef<"h" | "v" | null>(null);
  const activeAtStart = useRef(0);
  // Track the SPECIFIC pointer that started the gesture. Any
  // events from a second finger (multi-touch) are ignored — they
  // can no longer corrupt the dx/dy or accidentally commit.
  const activePointerId = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only the primary touch starts a swipe. Pinch / second-finger
    // events bail out so they can't mutate dx during a real drag.
    if (!e.isPrimary) return;
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    decided.current = null;
    activeAtStart.current = active;
    // Capture the pointer so subsequent move/up events route here
    // even if the finger leaves the carousel bounds (no premature
    // commit from pointerleave on a fast drag).
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (decided.current === null) {
      if (ax + ay < 12) return;
      if (ay > ax * 1.7 && ay >= 10) {
        decided.current = "v";
        startX.current = null;
        activePointerId.current = null;
        setDragBoth(0);
        return;
      }
      decided.current = "h";
    }
    if (decided.current !== "h") return;
    // Negative dx = swiping left = advance to next face = positive drag.
    const fraction = -dx / Math.max(1, faceWidth.current);
    const clamped = Math.max(-1, Math.min(1, fraction));
    // Edge resistance: rubber-band when trying to drag past the
    // first or last face. Past the boundary, drag is divided by 3.
    const wouldGo = activeAtStart.current + clamped;
    let final = clamped;
    if (wouldGo < 0) final = -activeAtStart.current + (clamped + activeAtStart.current) / 3;
    if (wouldGo > N - 1) final = (N - 1 - activeAtStart.current) + (clamped - (N - 1 - activeAtStart.current)) / 3;
    setDragBoth(final);
  };

  const finishGesture = (e?: React.PointerEvent) => {
    if (e && activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    if (startX.current === null) {
      activePointerId.current = null;
      return;
    }
    startX.current = null;
    decided.current = null;
    // Read the LATEST drag value from the ref — `drag` state may
    // not have flushed yet between the last pointermove and this
    // pointerup, which previously caused a stale-state commit
    // landing on the wrong card.
    const d = dragRef.current;
    let next = activeAtStart.current;
    if (d > 0.18) next = Math.min(N - 1, activeAtStart.current + 1);
    else if (d < -0.18) next = Math.max(0, activeAtStart.current - 1);
    setActive(next);
    setDragBoth(0);
    if (e && activePointerId.current !== null) {
      try { (e.target as Element).releasePointerCapture?.(activePointerId.current); } catch {}
    }
    activePointerId.current = null;
  };

  const rotation = -(active + drag) * FACE_ANGLE;
  // While the finger is down (drag != 0) we want a 1:1 follow with
  // no transition. After release (drag === 0) we let the snap-back
  // animation play.
  const isDragging = drag !== 0;

  return (
    <motion.div
      data-testid="paths-mobile-track"
      className="mx-auto"
      style={{
        width: "min(92vw, 440px)",
        // 1:1.42 keeps the same aspect the old cube used so the
        // surrounding page layout doesn't shift.
        aspectRatio: "1 / 1.42",
        // Perspective gives the rotation real depth. 1400 px is far
        // enough that face foreshortening looks natural without
        // making the prism feel like it's behind glass.
        perspective: "1400px",
      }}
      initial={reduced ? false : { opacity: 0, y: 60, scale: 0.88 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        ref={stageRef}
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          // Pull the prism back by `r` so the active face sits at
          // z=0 (= natural display size with no perspective scale).
          transform: `translateZ(calc(-1 * var(--face-depth, 0px))) rotateY(${rotation}deg)`,
          transition: isDragging
            ? "none"
            : "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
          touchAction: "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onPointerLeave={finishGesture}
      >
        {cards.map((card, i) => {
          const renderedCard = isValidElement(card)
            ? cloneElement(card as ReactElement<{ noReveal?: boolean; animated?: boolean }>, {
                // Mobile carousel still uses the noReveal layout
                // (flat anchor, no per-card framer-motion entrance)
                // because the entrance animation is now driven by
                // the prism's outer motion.div above. animated only
                // on the active face — saves ~100 framer-motion rAF
                // callbacks per second across the inactive faces.
                noReveal: true,
                animated: i === active,
              })
            : card;
          return (
            <div
              key={i}
              data-testid={`paths-mobile-slide-${i + 1}`}
              className="absolute inset-0"
              style={{
                // Each face: rotate to its prism position, then
                // translate outward by the inradius so it sits on
                // the prism's lateral surface.
                transform: `rotateY(${i * FACE_ANGLE}deg) translateZ(var(--face-depth, 0px))`,
                borderRadius: 18,
                overflow: "hidden",
                // CRITICALLY: no `backface-visibility: hidden`. iOS
                // Safari has a long-standing bug where that property
                // on a 3D-transformed parent unpredictably hides
                // child <svg> content — exactly what was wiping the
                // path-card illustrations under EffectCreative.
              }}
            >
              {renderedCard}
            </div>
          );
        })}
      </div>

      {/* Pagination dots — clickable, mirrors Swiper's pagination */}
      <div
        className="mt-6 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Path card navigation"
      >
        {cards.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Show card ${i + 1}`}
            onClick={() => setActive(i)}
            className="rounded-full transition-all duration-300"
            style={{
              height: 8,
              width: i === active ? 28 : 8,
              background:
                i === active
                  ? "linear-gradient(90deg, #ffe28a, #a78bfa 50%, #67e8f9)"
                  : "rgba(255,255,255,0.35)",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

