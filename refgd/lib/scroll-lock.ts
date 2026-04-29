"use client";

/**
 * Shared body scroll-lock used by the home-page hero animation and the
 * paths card stepper.
 *
 * Why `position: fixed` on <body> instead of `overflow: hidden`?
 *
 *  - It is the only cross-browser technique that genuinely freezes
 *    scroll on iOS Safari (where overflow:hidden is famously ignored).
 *  - It also avoids the previous bug where a setInterval would yank
 *    the page back to a saved Y every 16ms, producing the visible
 *    "the page slightly scrolls and then fixes itself" jitter that the
 *    user reported.
 *
 * The lock is **reference-counted** so that two coordinated regions
 * (CosmicJourney + PathsHorizontalReveal) can request a lock without
 * stomping on each other.
 */

let lockCount = 0;
let savedY = 0;
const savedBody: { [k: string]: string } = {};
let savedHtmlScrollBehavior = "";

/**
 * Lock the page at its current scroll position. The visible content
 * stays exactly where the user left it. Wheel/touch/keyboard scrolls
 * are blocked at the browser layer (no JS rAF loop required).
 */
export function lockScroll(): number {
  if (typeof window === "undefined") return 0;
  if (lockCount === 0) {
    savedY = window.scrollY;
    const body = document.body;
    savedBody.position = body.style.position;
    savedBody.top = body.style.top;
    savedBody.left = body.style.left;
    savedBody.right = body.style.right;
    savedBody.width = body.style.width;
    savedBody.overflow = body.style.overflow;
    savedHtmlScrollBehavior = document.documentElement.style.scrollBehavior;

    body.style.position = "fixed";
    body.style.top = `-${savedY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    document.documentElement.style.scrollBehavior = "auto";
  }
  lockCount++;
  return savedY;
}

/**
 * Release the lock. If `targetY` is provided, the page is restored to
 * that scroll position instead of where the lock began (used for the
 * welcome → paths handoff).
 */
export function unlockScroll(targetY?: number): void {
  if (typeof window === "undefined") return;
  if (lockCount === 0) return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const body = document.body;
    body.style.position = savedBody.position ?? "";
    body.style.top = savedBody.top ?? "";
    body.style.left = savedBody.left ?? "";
    body.style.right = savedBody.right ?? "";
    body.style.width = savedBody.width ?? "";
    body.style.overflow = savedBody.overflow ?? "";
    const restoreY = typeof targetY === "number" ? targetY : savedY;
    // Use 'instant' so we don't fight a previous smooth-scroll.
    window.scrollTo(0, restoreY);
    document.documentElement.style.scrollBehavior = savedHtmlScrollBehavior;
  }
}

export function isScrollLocked(): boolean {
  return lockCount > 0;
}
