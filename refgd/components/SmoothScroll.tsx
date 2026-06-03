"use client";

/**
 * SmoothScroll — Lenis-powered momentum scroll for the entire site.
 * Mounted ONCE in app/layout.tsx. v6.13.51 exposes the Lenis instance
 * on window.__lenis so components (e.g. PixelRainCosmic auto-scroll)
 * can call lenis.scrollTo() — native window.scrollTo() gets reverted
 * by Lenis on its next rAF tick because Lenis owns window.scrollY.
 */
import { useEffect } from "react";
import Lenis from "lenis";

declare global { interface Window { __lenis?: Lenis } }

export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;
    const isCoarsePointer =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (isCoarsePointer) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      prevent: (node: Element) =>
        node.hasAttribute?.("data-lenis-prevent") ||
        !!node.closest?.("[data-lenis-prevent]"),
      anchors: true,
    });

    // Expose for programmatic scroll-to (PixelRainCosmic auto-advance).
    window.__lenis = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      try { delete window.__lenis; } catch { window.__lenis = undefined; }
      lenis.destroy();
    };
  }, []);
  return null;
}
