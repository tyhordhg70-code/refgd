"use client";
import { useEffect } from "react";

/**
 * OffscreenGlowPauser — pauses the perpetual decorative glow animations
 * (pi-glow-* / pc-outer-glow-* / pulse-glow-*) while their element is
 * scrolled fully out of view, and resumes them well before they scroll
 * back in.
 *
 * Why: these are large blurred / box-shadow layers running `infinite`
 * CSS keyframes forever. Even when scrolled off-screen the compositor
 * keeps re-rasterising them every frame, which steals frame budget from
 * the custom cursor (and everything else) → the "generally laggy" feel.
 *
 * Strictly ZERO visual change by construction:
 *   - Only INFINITE animations are touched (one-shot reveals untouched).
 *   - `position: fixed` / `sticky` layers are skipped — the always-on
 *     full-viewport backgrounds (galaxy, orbs, overlays, loader glows)
 *     are never truly off-screen, so they are left exactly as-is.
 *   - A generous rootMargin resumes the animation ~400px before the
 *     element re-enters the viewport, so a frozen frame is never shown.
 *   - prefers-reduced-motion users are left alone (animations already
 *     disabled for them elsewhere).
 *
 * Pausing freezes an animation at its current phase; on resume it simply
 * continues. Each glow already runs at an independent duration, so there
 * is nothing to fall out of sync.
 */
const GLOW_SELECTOR = '[class*="pi-glow"],[class*="outer-glow"],[class*="pulse-glow"]';

export default function OffscreenGlowPauser() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observed = new Set<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          el.style.animationPlayState = entry.isIntersecting ? "" : "paused";
        }
      },
      { rootMargin: "400px 0px 400px 0px", threshold: 0 },
    );

    const isInfiniteAnimated = (el: Element) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (cs.animationName === "none") return false;
      if (cs.position === "fixed" || cs.position === "sticky") return false;
      return cs.animationIterationCount
        .split(",")
        .some((c) => c.trim() === "infinite");
    };

    const consider = (el: Element) => {
      if (observed.has(el)) return;
      if (!isInfiniteAnimated(el)) return;
      observed.add(el);
      io.observe(el);
    };

    const scan = (root: ParentNode) => {
      if (root instanceof Element && root.matches(GLOW_SELECTOR)) consider(root);
      root.querySelectorAll(GLOW_SELECTOR).forEach(consider);
    };

    const forget = (root: Element) => {
      if (observed.has(root)) {
        io.unobserve(root);
        observed.delete(root);
      }
      root.querySelectorAll(GLOW_SELECTOR).forEach((el) => {
        if (observed.has(el)) {
          io.unobserve(el);
          observed.delete(el);
        }
      });
    };

    const initial = () => scan(document.body);
    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    }).requestIdleCallback;
    if (typeof ric === "function") ric(initial);
    else window.setTimeout(initial, 200);

    // Catch late mounts and client-side route swaps. Incremental: only
    // walk the nodes that were actually added, debounced to one pass.
    let pending: Element[] = [];
    let timer: number | undefined;
    const flush = () => {
      timer = undefined;
      const nodes = pending;
      pending = [];
      nodes.forEach((n) => scan(n));
    };
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (n instanceof Element) pending.push(n);
        });
        // Stop tracking detached nodes immediately so the observer set
        // doesn't grow unbounded across a long editing session.
        r.removedNodes.forEach((n) => {
          if (n instanceof Element) forget(n);
        });
      }
      if (pending.length && timer === undefined) {
        timer = window.setTimeout(flush, 400);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  return null;
}
