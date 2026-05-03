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
      {/* v6.13.6 — Slow pulsating gradient replaces the previous flat
          ink-950 wash. The old layer was three locked radial gradients
          on a near-black linear backdrop — visually frozen. Now the
          stops travel and the whole layer cycles a tiny hue rotate so
          the page background is continuously alive (~22 s loop) but
          never busy enough to compete with foreground content. The
          horizontal-band reports the user kept catching mid-scroll
          go away too: a flat black bg + a fixed canvas with
          mix-blend-screen creates a visible seam wherever the canvas
          ends; an animated colour layer underneath always has tonal
          variation in the same place so the "line" never reads as
          discrete. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(245,185,69,0.16), transparent 55%)," +
            "radial-gradient(ellipse 80% 60% at 75% 80%, rgba(167,139,250,0.26), transparent 55%)," +
            "linear-gradient(180deg, #0b0820 0%, #1a0e3a 35%, #0a0820 70%, #07061a 100%)",
          backgroundSize: "180% 180%, 200% 200%, 100% 280%",
          animation: "bgPulseSlow 22s ease-in-out infinite",
          willChange: "background-position, filter",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 45%, transparent 0%, transparent 12%, rgba(5,6,10,0.55) 50%, rgba(5,6,10,0.92) 80%, rgb(5,6,10) 100%)",
        }}
      />
      {/* v6.8 (2026-05): top vignette previously started at full
          opaque rgb(5,6,10) for the first 25 vh of the viewport,
          which read on every page as a "horizontal black strip"
          locked to the top of the viewport (it did NOT scroll with
          the page because GalaxyBackground is `fixed inset-0`).
          The user reported this as "the black strip on home page
          and evasion and mentorship page". Softened: starts at
          0.55 alpha and fades over 35 vh so the top stars and
          colour wash are still visible while the AnnouncementBanner
          and Nav still get enough darkening for legibility. */}
      <div
        className="absolute inset-x-0 top-0 h-[35vh]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,6,10,0.55) 0%, rgba(5,6,10,0.32) 45%, transparent 100%)",
        }}
      />
      {/* v6.10.2 (2026-05): bottom vignette REMOVED.
          Previously a 55vh-tall fixed overlay sat at the bottom of the
          viewport to darken cards/text against the WebGL galaxy. Even
          after aligning its endpoint to body bg (#05060a) in v6.7, the
          gradient TRANSITION at its top edge (~45% down the viewport)
          remained visible as a soft horizontal band that the user
          repeatedly reported as a "gradient strip on bottom" on the
          mobile home page. Because GalaxyBackground is `fixed inset-0`,
          the band did not scroll with the page — it stayed glued to
          the bottom of the viewport on every scroll position, making
          it especially noticeable on the welcome hero where the
          backdrop is otherwise unbroken.
          The page sections (CosmicJourney, paths section, telegram
          CTA) all manage their own foreground contrast via per-element
          text-shadows and per-section backgrounds, so the global
          vignette is unnecessary. The body bg `bg-ink-950` (#05060a)
          below the page provides the natural dark continuation. */}
    </div>
  );
}
