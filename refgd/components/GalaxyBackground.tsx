"use client";
import { useEffect, useRef } from "react";

/**
 * Site-wide animated galaxy / particle field.
 *
 * Architecture: Three.js runs entirely in a Web Worker with an OffscreenCanvas
 * so the main JavaScript thread is NEVER blocked by WebGL draw calls.
 * The main thread sends lightweight postMessages for scroll/mouse/resize events.
 * The worker renders at adaptive FPS (33ms idle / 80ms while scrolling).
 *
 * Fallback: if OffscreenCanvas is unavailable (rare — Safari < 17.4),
 * the galaxy is hidden. A static gradient still provides depth.
 */
export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // OffscreenCanvas not available in very old browsers / Safari < 17.4.
    // In that case simply don't render — the static gradient still looks fine.
    if (typeof (canvas as any).transferControlToOffscreen !== "function") return;

    const offscreen = (canvas as any).transferControlToOffscreen() as OffscreenCanvas;
    const worker = new Worker(
      new URL("../workers/galaxy.worker.js", import.meta.url),
    );

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const isTablet = window.matchMedia("(max-width: 1100px)").matches;

    worker.postMessage(
      { type: "init", canvas: offscreen, width: window.innerWidth, height: window.innerHeight,
        dpr: window.devicePixelRatio ?? 1, isMobile, isTablet },
      [offscreen as unknown as Transferable],
    );

    const onScroll = () =>
      worker.postMessage({ type: "scroll", scrollPx: window.scrollY });
    const onMouse = (e: MouseEvent) =>
      worker.postMessage({
        type: "mouse",
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    const onResize = () =>
      worker.postMessage({ type: "resize", width: window.innerWidth, height: window.innerHeight });
    const onVisibility = () =>
      worker.postMessage({ type: "visibility", visible: !document.hidden });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      worker.postMessage({ type: "destroy" });
      worker.terminate();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      {/* WebGL canvas — control is transferred to the Web Worker */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "screen" }}
      />
      {/* Static gradients — always visible, cost nothing */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(245,185,69,0.12), transparent 55%)," +
            "radial-gradient(ellipse at 75% 75%, rgba(167,139,250,0.18), transparent 55%)," +
            "linear-gradient(180deg, #07060c 0%, #0a0814 50%, #06060c 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 45%, transparent 0%, transparent 12%, rgba(5,6,10,0.55) 50%, rgba(5,6,10,0.92) 80%, rgb(5,6,10) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[45vh]"
        style={{
          background:
            "linear-gradient(to bottom, rgb(5,6,10) 0%, rgba(5,6,10,0.92) 25%, rgba(5,6,10,0.5) 60%, transparent 100%)",
        }}
      />
      {/* Bottom vignette darkens the lower 55vh so foreground text/cards
          read on top of stars. Endpoint MUST match body `bg-ink-950`
          (#05060a) — previously this gradient ended at `rgb(10,12,20)`
          (#0a0c14, ink-900). The 4-point lightness step between this
          fixed-position vignette and the body bg below the page rendered
          as a slightly-lighter horizontal band glued to the bottom 55vh
          of the viewport. As the user scrolled the welcome screen on
          mobile, that band visibly slid down/up and read as a "small
          black strip overlay on bottom" against the slightly-lighter
          welcome backdrop. Aligning all stops to rgb(5,6,10) removes
          the step so the vignette dissolves invisibly into body bg. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55vh]"
        style={{
          background:
            "linear-gradient(to top, rgb(5,6,10) 0%, rgba(5,6,10,0.95) 22%, rgba(5,6,10,0.65) 55%, transparent 100%)",
        }}
      />
    </div>
  );
}
