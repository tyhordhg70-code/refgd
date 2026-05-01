"use client";

/**
 * SmoothScroll — Lenis-powered momentum scroll for the entire site.
 *
 * Mounted ONCE in app/layout.tsx so every route inherits buttery
 * wheel/trackpad scrolling without affecting page architecture.
 *
 * Design rules (carefully chosen so existing animations keep working):
 *   1. `smoothWheel: true`        — desktop wheel/trackpad gets eased.
 *   2. `syncTouch:   false`       — leave native iOS momentum scroll
 *      ALONE on touch devices. Forcing JS-driven smoothing on mobile
 *      regresses our previous "iPhone laggy / cards distorted on
 *      swipe" reports.
 *   3. `prevent`                   — bail on any element that opts
 *      out (data-lenis-prevent) so Swiper carousels, modals, code
 *      blocks etc keep their own scroll.
 *   4. Respects `prefers-reduced-motion` — fully disabled when the
 *      user has reduced motion on (no Lenis instance is created).
 *   5. Does NOT touch `position: fixed` / `position: sticky` — Lenis
 *      drives `window.scrollY` only, so CustomCursor, GalaxyBackground,
 *      Nav, EditorToolbar etc keep working as before.
 *   6. framer-motion's `useInView` / `whileInView` rely on the native
 *      IntersectionObserver against the viewport, which Lenis does
 *      NOT change (it only animates the page transform). So all
 *      reveal-on-scroll animations continue to fire normally.
 */

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Honour the user's reduced-motion preference: bail entirely.
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // ── Mobile / touch: skip Lenis entirely ──────────────────────────
    // Below we already set `syncTouch: false` so Lenis does NOTHING
    // visible on phones — iOS/Android native momentum drives every
    // scroll. But the Lenis instance was still mounting and ticking a
    // rAF loop EVERY frame on mobile, doing internal bookkeeping that
    // does nothing the user can see while still stealing main-thread
    // budget. During the Swiper cube swipe gesture this rAF was
    // competing with Swiper's own touch handler for the same 16 ms
    // frame slot, contributing to the "still laggy" report.
    //
    // Detection uses `pointer: coarse` (any device whose primary
    // pointer is a finger) — same predicate CustomCursor uses for
    // the inverse case. Desktops with a touchscreen + mouse stay on
    // the smooth-wheel path because their primary pointer is fine.
    const isCoarsePointer =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (isCoarsePointer) return;

    const lenis = new Lenis({
      // Easing curve for wheel-driven smoothing (Lusion-style ease-out).
      // 1.05 lerp gives a smooth-but-snappy feel that doesn't lag the
      // user's fingertip / trackpad input.
      lerp: 0.1,
      // Touch is intentionally NOT smoothed — iOS already provides
      // best-in-class momentum, and JS-driven smoothing on mobile
      // fights Swiper's cube cards (the source of previous regressions).
      smoothWheel: true,
      syncTouch: false,
      // Respect any element flagged with data-lenis-prevent — used by
      // Swiper carousels, scrollable modals, etc.
      prevent: (node: Element) =>
        node.hasAttribute?.("data-lenis-prevent") ||
        !!node.closest?.("[data-lenis-prevent]"),
      // Don't intercept anchor-tag clicks; let normal browser scroll
      // (and JS scrollIntoView calls inside the app) drive things.
      anchors: false,
    });

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}
