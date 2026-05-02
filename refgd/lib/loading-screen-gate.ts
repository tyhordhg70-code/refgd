"use client";

import { useEffect, useState } from "react";

/**
 * Loading-screen entrance gate.
 *
 * Why this exists
 * ───────────────
 * On a fresh full-page load, <LoadingScreen> covers the entire
 * viewport for ~1.5 - 2.4 s while images / fonts / WebGL warm up.
 * During that window the React tree behind it has already mounted,
 * which means every component using `whileInView` /
 * IntersectionObserver-driven entrance animation fires IMMEDIATELY
 * (because their elements are intersecting from frame 1, hidden
 * underneath the splash).
 *
 * The result the user reported: "page load animation for home page
 * is not visible after loading screen but when coming back to it
 * from another page it shows" — the entrance literally plays behind
 * the splash and lands in its final state by the time the splash
 * fades. Client-side navigation re-mounts the page tree without the
 * splash, so the entrance is visible the second time around.
 *
 * The fix
 * ───────
 * <LoadingScreen> sets a module-level flag `__refgdLoadingActive`
 * to `true` on import (synchronously, before any other component
 * mounts) and dispatches `refgd:loading-complete` when it begins
 * to fade. Entrance components call `useEntranceReady()` and only
 * trigger their animation once that hook flips to `true`.
 *
 * On client-side route navigations the LoadingScreen module is
 * already loaded, the flag is already cleared, and the hook
 * returns `true` synchronously on first render — so entrances
 * play normally without any deferral.
 */

export const LOADING_FLAG = "__refgdLoadingActive" as const;
export const LOADING_COMPLETE_EVENT = "refgd:loading-complete";

/**
 * Mark the loading screen as currently active. Called by
 * <LoadingScreen> at module-import time so the flag is set before
 * any other entrance component reads it during their mount-time
 * gating decision.
 */
export function markLoadingActive(): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, boolean>)[LOADING_FLAG] = true;
}

/**
 * Mark the loading screen as complete. Called by <LoadingScreen>
 * the moment it begins fading out. Also dispatches the public
 * window event that gated entrance hooks subscribe to.
 */
export function markLoadingComplete(): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, boolean>)[LOADING_FLAG] = false;
  try {
    window.dispatchEvent(new CustomEvent(LOADING_COMPLETE_EVENT));
  } catch {
    /* CustomEvent unavailable in extremely old browsers; gate falls
       open via the safety timeout in useEntranceReady. */
  }
}

/**
 * Returns `true` when entrance animations are clear to play.
 *
 *   • On full page load — returns `false` while <LoadingScreen> is up,
 *     then flips to `true` on `refgd:loading-complete`.
 *   • On client-side navigation — returns `true` immediately because
 *     the loading flag was already cleared on initial load.
 *   • On SSR — returns `false` so hydration matches the "pre-entrance"
 *     state without mismatch warnings.
 *
 * A 6 s safety timer flips the gate open even if the event somehow
 * never fires, so a missed signal can never strand cards forever.
 */
export function useEntranceReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !(window as unknown as Record<string, boolean>)[LOADING_FLAG];
  });

  useEffect(() => {
    if (ready) return;
    const onComplete = () => setReady(true);
    window.addEventListener(LOADING_COMPLETE_EVENT, onComplete);
    const safety = window.setTimeout(() => setReady(true), 6000);
    return () => {
      window.removeEventListener(LOADING_COMPLETE_EVENT, onComplete);
      window.clearTimeout(safety);
    };
  }, [ready]);

  return ready;
}
