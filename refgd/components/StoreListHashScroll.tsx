"use client";

import { useEffect } from "react";
import { LOADING_FLAG, LOADING_COMPLETE_EVENT } from "@/lib/loading-screen-gate";

// Matches each section's / card's Tailwind `scroll-mt-24` (6rem = 96px) so a
// deep-linked target lands clear of the fixed nav — the same spot the in-page
// anchors do.
const SECTION_SCROLL_MARGIN = 96;

// Re-jump a few times once scrolling is unlocked: the early attempts cover any
// loading-unlock race, the later ones correct layout shift as below-the-fold
// media settles. Every attempt is a no-op once we're parked on target, and the
// whole schedule aborts the instant the visitor interacts.
const ATTEMPT_DELAYS_MS = [0, 200, 500, 1000, 1600];

// Only our own anchor scheme is honoured, so an unrelated hash can never hijack
// the page scroll. Section ids are `cat-<slug>`, store cards are `store-<slug>`.
const ANCHOR_RE = /^(?:cat|store)-[a-z0-9-]+$/;

type LenisLike = { scrollTo?: (target: unknown, options?: unknown) => void };

/**
 * StoreListHashScroll — renders nothing. On a fresh load of
 * /store-list#cat-<slug> or /store-list#store-<slug> it scrolls the visitor to
 * that section / card. A custom handler is used (rather than the browser's
 * native fragment scroll) because the site historically locked body scroll
 * during boot, clamping the native scroll to the top with no retry. Desktop
 * scrolls via Lenis (a native window.scrollTo is reverted by Lenis); mobile /
 * no-Lenis uses an instant native scroll. A matching store card opens its own
 * info popup independently from the same hash. No / unrelated hashes return
 * immediately, leaving normal loads untouched.
 */
export default function StoreListHashScroll() {
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
    if (!ANCHOR_RE.test(id)) return;

    let cancelled = false;
    let userInteracted = false;
    const timers: number[] = [];
    let raf1 = 0;
    let raf2 = 0;
    let onComplete: (() => void) | null = null;
    let safety = 0;

    const onUserInteract = () => {
      userInteracted = true;
    };

    const jumpToTarget = () => {
      if (cancelled || userInteracted) return;
      const el = document.getElementById(id);
      if (!el) return;
      const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(el, {
          offset: -SECTION_SCROLL_MARGIN,
          immediate: true,
          force: true,
        });
      } else {
        const top = Math.max(
          0,
          window.scrollY + el.getBoundingClientRect().top - SECTION_SCROLL_MARGIN,
        );
        const opts: ScrollToOptions = { top };
        (opts as Record<string, unknown>).behavior = "instant";
        window.scrollTo(opts);
      }
    };

    const runSchedule = () => {
      if (cancelled) return;
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
