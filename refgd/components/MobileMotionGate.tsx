"use client";
import { useEffect } from "react";
import { MotionGlobalConfig } from "framer-motion";
import { isMobileLike } from "@/lib/iosCheck";

/**
 * MobileMotionGate — global kill-switch for framer-motion animations
 * on mobile-like devices.
 *
 * Why this exists
 * ───────────────
 * Roughly 50 components in this app use framer-motion's `whileInView`
 * with `initial={{ opacity: 0, y: ... }}`. On desktop the IntersectionObserver
 * that backs `whileInView` fires reliably and the elements animate IN.
 *
 * On mobile (iOS Safari, Chrome Android, Samsung Internet, in-app
 * browsers, etc.) that IntersectionObserver fails in a surprising
 * number of cases:
 *
 *   • URL-bar collapse changes innerHeight between IO setup and the
 *     element entering the trigger zone, so the rootMargin used by
 *     framer's viewport detector points at a viewport that no longer
 *     matches reality
 *   • late layout shift from web fonts / images / aspect-ratio recalcs
 *     can advance the element through the IO trigger band in a single
 *     frame, which IO can miss
 *   • an ancestor with `transform` / `contain` / `filter` (very common
 *     in this codebase — orbs, parallax wrappers, 3D scenes) confuses
 *     IO's root rect calculation so the intersection never registers
 *   • iOS Safari rubber-band scroll and Android over-scroll can pass
 *     the element through the band without firing
 *
 * When that IntersectionObserver fails to fire, the element is
 * stranded at its `initial` state forever — most commonly opacity:0
 * — and the user sees a blank space where the content should be.
 * Tapping or scrolling cannot recover it.
 *
 * The reveal components in `lib/iosCheck.ts` (Reveal, SafeReveal,
 * KineticText, LedTicker) already bypass their own hide-then-reveal
 * pattern on mobile-like devices for the same reason. This file
 * extends the same protection to every framer-motion `whileInView` /
 * `animate` / `initial` usage in the codebase without having to patch
 * each component individually.
 *
 * How it works
 * ────────────
 * framer-motion exposes `MotionGlobalConfig.skipAnimations`. When
 * set to true, every motion component skips its animation step and
 * jumps directly to the `animate` (or final) state on mount. Combined
 * with `whileInView`, the element renders at the final state from
 * the very first paint — no IntersectionObserver dependency at all.
 *
 * We set this flag at module-load time (so it runs before any client
 * component that imports framer-motion gets a chance to instantiate
 * a motion element) AND again inside useEffect as a belt-and-braces
 * guard for race conditions during hydration. The module-level set
 * is guarded by `typeof window !== "undefined"` so SSR is unaffected.
 *
 * Desktop (hover:hover, pointer:fine, innerWidth ≥ 1024) is
 * completely unaffected — `isMobileLike()` returns false and no
 * flag is ever flipped. Desktop continues to get the full reveal
 * animations.
 *
 * The component renders nothing — it's purely a side-effect carrier.
 */
if (typeof window !== "undefined") {
  try {
    if (isMobileLike()) {
      MotionGlobalConfig.skipAnimations = true;
    }
  } catch {
    // framer-motion not loaded yet or MotionGlobalConfig missing —
    // useEffect below will catch it on hydration.
  }
}

export default function MobileMotionGate() {
  useEffect(() => {
    if (isMobileLike()) {
      MotionGlobalConfig.skipAnimations = true;
    }
  }, []);
  return null;
}
