"use client";
import { useEffect } from "react";
import { isMobileLike } from "@/lib/iosCheck";

/**
 * MobileCompatFlag (legacy filename IOSSafariFlag) — invisible
 * mount-once component that detects mobile-like devices and applies
 * global compositing-pressure relief that cannot be expressed with
 * media queries alone.
 *
 * History
 * ───────
 * Previous versions of this file scoped these fixes to `isIOSSafariLike()`
 * because the original failure reports (chapter pill, region buttons,
 * LED ticker invisible) all came from iPhone Safari. Subsequent reports
 * confirmed the same paint-skip on Chrome Android — the user reproduced
 * with screenshots showing a gray box in place of the Canada/UK region
 * buttons and a huge blank where the ServiceSection hero title should
 * be, and noted "if I tap on missing element and select the text it
 * becomes visible again". That symptom (selection / focus forces a
 * GPU re-rasterization) is the canonical fingerprint of a paint-skip
 * bug, not a JS / IntersectionObserver problem, and it is shared by
 * iOS Safari WebKit and Chrome Android Blink when too many GPU layers
 * are alive on a page that also has a tall scroll-driven background.
 *
 * The root cause is the same on both engines: backdrop-filter
 * containers + lots of will-change descendants + a 1000vh scroll
 * background = the compositor evicts rasterized tiles to save GPU
 * memory and then occasionally fails to re-rasterize them on the
 * next scroll, leaving the element painted-but-blank. Selection,
 * focus, or any forced reflow re-rasterizes those tiles.
 *
 * The mitigation is identical on both: drop the backdrop-filter
 * (cards still read fine because their underlay is already ~95%
 * opaque) and release the orb mesh's eager layer promotion. Doing
 * this on iOS alone fixed the iOS-specific reports; broadening the
 * gate to `isMobileLike()` extends the same fix to Chrome Android,
 * Samsung Internet, Firefox Android, and every in-app browser
 * without changing desktop behaviour at all.
 *
 * What it does on mobile-like devices only:
 *
 *   (1) Sets `data-mobile-compat="1"` on <html>. Legacy CSS that
 *       targets `:root[data-ios-safari]` is kept working by also
 *       setting that attribute when the device is specifically iOS
 *       Safari, so nothing else in the app needs to change.
 *
 *   (2) Injects a stylesheet that disables every `backdrop-filter`
 *       on the page. WebKit on iOS has a long-standing rendering
 *       bug where children of a backdrop-filter parent fail to
 *       paint once the content behind the backdrop is animated;
 *       Chrome Android has a similar tile-eviction bug on heavy
 *       pages. Both pages here paint a 1000vh orb mesh / gradient
 *       spot layer behind every section, which is exactly the
 *       background-motion pattern that triggers both bugs. Visible
 *       casualties were the "chapter 05" pill (inside the storelist
 *       hero card), the region buttons (inside the filter card),
 *       the ServiceSection hero KineticText, and the neighbouring
 *       LED ticker.
 *
 *   (3) The cards underneath these `backdrop-filter` styles all
 *       already declare a ~95% opaque linear-gradient background,
 *       so dropping the blur changes them from "frosted glass over
 *       moving orbs" to "almost-opaque glass over moving orbs" —
 *       visually almost identical, and importantly the children
 *       now render reliably.
 *
 *   (4) Also disables `will-change` on the page-level orb mesh
 *       (`.orb` class) so the four orbs do not each claim a
 *       dedicated GPU layer. The orbs remain animated and
 *       coloured — the only thing dropped is the eager layer
 *       promotion, which on both engines makes the layer cache
 *       cheaper and the eviction-of-content bug much less likely.
 *
 * Every desktop browser sees no behaviour change at all:
 * `isMobileLike()` returns false on hover:hover + pointer:fine +
 * innerWidth ≥ 1024 and the effect short-circuits on the first line.
 */
export default function IOSSafariFlag() {
  useEffect(() => {
    if (!isMobileLike()) return;
    document.documentElement.setAttribute("data-mobile-compat", "1");
    // Keep legacy attribute set on actual iOS for any external CSS
    // that may still depend on it.
    if (
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent || "") ||
        (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent || "")))
    ) {
      document.documentElement.setAttribute("data-ios-safari", "1");
    }
    if (document.getElementById("ios-safari-fixes")) return;
    const style = document.createElement("style");
    style.id = "ios-safari-fixes";
    style.textContent = `
:root[data-mobile-compat] *,
:root[data-mobile-compat] *::before,
:root[data-mobile-compat] *::after {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:root[data-mobile-compat] .orb {
  will-change: auto !important;
}
/* ─── v16 safety net ────────────────────────────────────────────────
 * Reveal-component classes (Reveal / SafeReveal / KineticText /
 * LedTicker) are ALREADY mobile-bypassed in JS (see lib/iosCheck.ts
 * isMobileLike). This rule is a belt-and-braces defence in case any
 * of those classes ever land on the DOM through a React remount,
 * hydration race, or future regression: on mobile they are forced
 * visible regardless of what JS thinks.
 *
 * Also forces overflow:visible on a couple of common wrapper
 * patterns where ancestor clipping has been observed to compound
 * with paint-skip and hide entire region grids / chapter blocks.
 * ────────────────────────────────────────────────────────────────── */
:root[data-mobile-compat] .rv-hidden,
:root[data-mobile-compat] .sr-hidden,
:root[data-mobile-compat] .kt-hidden,
:root[data-mobile-compat] .lt-hidden,
:root[data-mobile-compat] [data-reveal-pending="1"] {
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  filter: none !important;
  clip-path: none !important;
}
`;
    document.head.appendChild(style);
  }, []);
  return null;
}
