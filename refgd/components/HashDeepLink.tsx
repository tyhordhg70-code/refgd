"use client";

import { useEffect } from "react";

/**
 * HashDeepLink — turns "refundgod.io/#telegram" into a shareable deep link
 * that, on a fresh page load, lands the visitor directly on the home page's
 * Telegram box (<section id="telegram">). It renders nothing.
 *
 * Why a custom handler is needed (and why it's an INSTANT jump, not smooth)
 * ────────────────────────────────────────────────────────────────────────
 * Two home-page systems defeat the browser's built-in "scroll to #fragment
 * on load", so it can't be relied on:
 *
 *   1. <LoadingScreen> covers the viewport and LOCKS body scroll
 *      (overflow:hidden) for ~1.1s+ on this heavy-asset route. The browser's
 *      native fragment scroll fires while the body is locked, gets clamped to
 *      the top, and is never retried. The splash exposes the flag
 *      window.__refgdLoadingActive (true while up) and dispatches
 *      "refgd:loading-complete" the moment it starts fading / unlocks scroll.
 *
 *   2. The hero (<CosmicJourney>) auto-"hands off" to #paths when the user
 *      scrolls DOWN from the very top. On DESKTOP that trigger fires from a
 *      scroll listener whenever scrollY passes through (2 .. 0.6*innerHeight).
 *      A SMOOTH programmatic scroll from the top animates through that window
 *      and would get hijacked to #paths. An INSTANT jump lands far below
 *      0.6*innerHeight in a single step, so the only emitted scroll event
 *      reports a large y and the trigger condition (y < 0.6*vh) never matches.
 *      Programmatic scrolling also emits no wheel/touch/key events, so the
 *      hero's wheel/keyboard and mobile-touch handoff triggers stay dormant.
 *      (On mobile that scroll-based trigger is disabled entirely, so an instant
 *      jump is doubly safe there.)
 *
 * Desktop scrolls via Lenis (window.__lenis.scrollTo, immediate) because a
 * native window.scrollTo is reverted by Lenis. Mobile has no Lenis, so a native
 * instant scroll to the computed target position is used. The 12vh landing
 * margin matches the telegram section's existing [scroll-margin-top:12vh] so
 * the headline clears the fixed nav.
 *
 * No-hash visitors return immediately, so the hero's normal first-scroll
 * behaviour is untouched.
 */

// Only these hash ids are honoured as in-page scroll targets, so an unrelated
// hash can never hijack the page. Currently just the shareable Telegram box.
const DEEP_LINK_IDS = new Set(["telegram"]);

// Matches the telegram section's [scroll-margin-top:12vh].
const LANDING_MARGIN = 0.12;

// Re-jump a few times once we're clear to scroll: the early attempts cover the
// body-unlock timing race; the later ones correct for any layout shift as
// below-the-fold media settles. Every attempt is a no-op once we're already
// parked on target, and the whole schedule aborts the instant the user
// interacts, so we never yank a visitor who has started exploring.
const ATTEMPT_DELAYS_MS = [0, 200, 500, 1000, 1600];

const LOADING_FLAG = "__refgdLoadingActive";
const LOADING_COMPLETE_EVENT = "refgd:loading-complete";

type LenisLike = { scrollTo?: (target: unknown, options?: unknown) => void };

export default function HashDeepLink() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.location.hash;
    if (!raw || raw.length < 2) return;

    let id = "";
    try {
      id = decodeURIComponent(raw.slice(1));
    } catch {
      id = raw.slice(1);
    }
    if (!DEEP_LINK_IDS.has(id)) return;

    let cancelled = false;
    let userInteracted = false;
    const timers: number[] = [];

    const onUserInteract = () => {
      userInteracted = true;
    };

    const jumpToTarget = () => {
      if (cancelled || userInteracted) return;
      const el = document.getElementById(id);
      if (!el) return;

      const margin = Math.round(window.innerHeight * LANDING_MARGIN);
      const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;

      if (lenis && typeof lenis.scrollTo === "function") {
        // Desktop: Lenis owns the scroll position. immediate:true skips the
        // hero's (2 .. 0.6*vh) handoff trigger window; force:true scrolls even
        // if Lenis happened to be stopped; the negative offset stops short by
        // the section's scroll-margin so the headline clears the nav.
        lenis.scrollTo(el, { offset: -margin, immediate: true, force: true });
      } else {
        // Mobile / no-Lenis: native instant jump to the computed top. We set
        // behavior:"instant" so the page's CSS `scroll-behavior: smooth` can't
        // turn this into an animated scroll. The behavior is assigned through a
        // loosely-typed options object so it compiles even on an older lib.dom
        // whose ScrollBehavior union predates "instant".
        const top = Math.max(
          0,
          window.scrollY + el.getBoundingClientRect().top - margin,
        );
        const opts: ScrollToOptions = { top };
        (opts as Record<string, unknown>).behavior = "instant";
        window.scrollTo(opts);
      }
    };

    let raf1 = 0;
    let raf2 = 0;
    const runSchedule = () => {
      if (cancelled) return;
      // Wait one committed paint so the post-splash layout is settled, then run
      // the guarded re-jump schedule. Both rAFs bail if we've unmounted in the
      // meantime so no orphan timers are ever enqueued.
      raf1 = requestAnimationFrame(() => {
        if (cancelled) return;
        raf2 = requestAnimationFrame(() => {
          if (cancelled) return;
          for (const delay of ATTEMPT_DELAYS_MS) {
            timers.push(window.setTimeout(jumpToTarget, delay));
          }
        });
      });
    };

    // Abort the corrective re-jumps the moment the visitor takes over.
    window.addEventListener("wheel", onUserInteract, { passive: true });
    window.addEventListener("touchstart", onUserInteract, { passive: true });
    window.addEventListener("keydown", onUserInteract, { passive: true });
    window.addEventListener("pointerdown", onUserInteract, { passive: true });

    const loadingActive =
      (window as unknown as Record<string, unknown>)[LOADING_FLAG] === true;

    let onComplete: (() => void) | null = null;
    let safety = 0;

    if (loadingActive) {
      onComplete = () => {
        if (safety) window.clearTimeout(safety);
        runSchedule();
      };
      window.addEventListener(LOADING_COMPLETE_EVENT, onComplete, {
        once: true,
      });
      // Safety: if the completion event somehow never fires, run anyway.
      safety = window.setTimeout(() => {
        if (onComplete) {
          window.removeEventListener(LOADING_COMPLETE_EVENT, onComplete);
        }
        runSchedule();
      }, 8000);
    } else {
      runSchedule();
    }

    return () => {
      cancelled = true;
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      for (const t of timers) window.clearTimeout(t);
      if (safety) window.clearTimeout(safety);
      if (onComplete) {
        window.removeEventListener(LOADING_COMPLETE_EVENT, onComplete);
      }
      window.removeEventListener("wheel", onUserInteract);
      window.removeEventListener("touchstart", onUserInteract);
      window.removeEventListener("keydown", onUserInteract);
      window.removeEventListener("pointerdown", onUserInteract);
    };
  }, []);

  return null;
}
