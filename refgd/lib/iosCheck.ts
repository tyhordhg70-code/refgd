/**
 * iOS Safari detection — used by the reveal components to opt out
 * of GPU-layer entrance animations.
 *
 * The vanishing bug is iOS Safari's compositor caching a stale
 * (often empty) bitmap of any element that's been promoted to a
 * GPU layer via `transform`, `opacity`, `will-change`, or
 * `transition` of those properties. When the layer scrolls out
 * of view and back, iOS sometimes shows the cached blank bitmap
 * instead of re-rasterizing the element. Tapping forces a
 * repaint, which is why the user always saw elements reappear
 * on tap. Seven CSS-only fixes (keyframes with various fill-
 * modes, IO-replay, classList mutation, React-state className,
 * pure CSS transitions) all failed because they all still
 * promote the element to a layer.
 *
 * The only guaranteed fix is to not animate at all on iOS Safari.
 * Desktop, Android, and every non-iOS-Safari browser still gets
 * the full entrance animations.
 *
 * Detection notes:
 *   - iPadOS 13+ reports as "Macintosh" — we cross-check with
 *     maxTouchPoints to catch iPads.
 *   - Chrome/Firefox/Edge on iOS use WebKit under the hood but
 *     have their own UA strings (CriOS, FxiOS, EdgiOS). Those
 *     suffer the same bug — so we treat them as iOS Safari too.
 */
export function isIOSSafariLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  return isIOS;
}
