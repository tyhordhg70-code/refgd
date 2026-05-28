"use client";
import { useEffect } from "react";
import { isIOSSafariLike } from "@/lib/iosCheck";

/**
 * IOSSafariFlag — invisible mount-once component that detects
 * iPhone/iPad Safari and applies global compatibility fixes that
 * cannot be expressed with media queries alone.
 *
 * What it does on iOS Safari only:
 *
 *   (1) Sets `data-ios-safari="1"` on <html>, so any CSS we ever
 *       want to scope to iOS can target `:root[data-ios-safari]`.
 *
 *   (2) Injects a stylesheet that disables every `backdrop-filter`
 *       on the page. iOS Safari has a long-standing rendering bug
 *       where children of a backdrop-filter parent fail to paint
 *       (or paint blank) once the content behind the backdrop is
 *       animated — which on this site is unavoidable because the
 *       storelist page paints a 1000vh orb mesh / gradient spot
 *       layer behind every section. The visible casualties were
 *       the "chapter 05" pill (inside the storelist hero card),
 *       the region buttons (inside the filter card), and the
 *       neighbouring LED ticker.
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
 *       promotion, which on iOS makes the layer cache cheaper
 *       and the eviction-of-content bug much less likely.
 *
 * Every non-iOS-Safari browser sees no behaviour change at all:
 * the effect short-circuits on the first line.
 */
export default function IOSSafariFlag() {
  useEffect(() => {
    if (!isIOSSafariLike()) return;
    document.documentElement.setAttribute("data-ios-safari", "1");
    if (document.getElementById("ios-safari-fixes")) return;
    const style = document.createElement("style");
    style.id = "ios-safari-fixes";
    style.textContent = `
:root[data-ios-safari] *,
:root[data-ios-safari] *::before,
:root[data-ios-safari] *::after {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:root[data-ios-safari] .orb {
  will-change: auto !important;
}
`;
    document.head.appendChild(style);
  }, []);
  return null;
}
