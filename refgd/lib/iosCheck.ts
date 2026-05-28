/**
 * iOS Safari + mobile detection helpers used by the reveal
 * components to opt out of GPU-layer entrance animations.
 *
 * Two functions, intentionally separated:
 *
 *   isIOSSafariLike() — narrow: true ONLY for iOS Safari / Chrome iOS
 *     / Firefox iOS (anything using WebKit on iPhone or iPad). Kept
 *     for backdrop-filter and other strictly-iOS-Safari workarounds
 *     (see IOSSafariFlag and IOSHide).
 *
 *   isMobileLike() — broad: true for iOS Safari AND for every other
 *     touch / small-viewport device (Chrome Android, Samsung Internet,
 *     Android Firefox, etc.). Used by the four reveal components
 *     (Reveal, SafeReveal, KineticText, LedTicker) to bypass their
 *     IntersectionObserver-driven hide/reveal animation entirely on
 *     anything mobile-like.
 *
 * Why the broader check is needed for the reveal components:
 *
 * The reveal pattern is "if off-screen at mount, setHidden(true);
 * IntersectionObserver fires later to setHidden(false)". The hidden
 * state sets opacity:0 + a translateY/translateX transform. If the
 * IntersectionObserver never fires (URL-bar collapse changing
 * innerHeight between rect-check and observe; late layout shift from
 * fonts / images / aspect-ratio recalcs; an ancestor whose transform
 * or contain rules trip up IO root calculation; any of half a dozen
 * mobile-specific edge cases), the element is stranded at opacity:0
 * forever. This is unrecoverable from the user's side and was the
 * cause of the vanishing region buttons / chapter pill / submit
 * button on both iOS Safari Private Mode and Chrome Android.
 *
 * The fix is the same one we already applied to iOS Safari: skip
 * the hide step entirely on mobile-like devices. Content paints once,
 * stays visible, no entrance animation. Desktop continues to get the
 * full reveal animation because hover/pointer devices and wide
 * viewports both fail the mobile check.
 */
export function isIOSSafariLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  return isIOS;
}

/**
 * True for any "mobile-like" device. Returns true if ANY of:
 *   - isIOSSafariLike() (iPhone, iPad, including iPadOS-as-Mac)
 *   - the platform self-identifies as touch-only via the standard
 *     CSS media query (Chrome Android, Samsung Internet, Firefox
 *     Android, in-app browsers, etc.)
 *   - innerWidth is below the tablet breakpoint (defensive fallback
 *     for cases where matchMedia is unavailable or returns false on
 *     a hybrid device)
 *
 * Safe to call during SSR — returns false when window/navigator
 * are undefined.
 */
export function isMobileLike(): boolean {
  if (typeof window === "undefined") return false;
  if (isIOSSafariLike()) return true;
  try {
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      return true;
    }
  } catch {
    // matchMedia missing / throws — ignore and fall through
  }
  if ((window.innerWidth || 0) < 1024) return true;
  return false;
}
