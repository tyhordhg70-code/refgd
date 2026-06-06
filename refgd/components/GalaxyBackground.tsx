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

    // ── Pause this WebGL context whenever it is fully occluded ──────────────
    // On the home route the hero is a full-viewport OPAQUE Spline scene
    // (its sticky container paints solid #05060a). While the user sits at the
    // very top — i.e. during the idle welcome pose AND the entire 6 s scroll
    // flight, which locks scrollY at 0 — this galaxy is 100% hidden behind it,
    // yet a second WebGL context would otherwise keep rendering right when the
    // Spline flight needs the whole GPU budget. So we pause the worker at
    // dead-top of "/" and resume it the instant any scroll reveals the page
    // below the hero. Every other route / scroll position renders normally,
    // and tab-hidden always pauses. No visual change — it's invisible when paused.
    let lastVisible = true;
    const computeVisible = () => {
      if (document.hidden) return false;
      const onHome =
        window.location.pathname === "/" || window.location.pathname === "";
      if (onHome && window.scrollY < 4) return false;
      return true;
    };
    const syncVisible = () => {
      const v = computeVisible();
      if (v !== lastVisible) {
        lastVisible = v;
        worker.postMessage({ type: "visibility", visible: v });
      }
    };

    // rAF-coalesce scroll + mouse so we post AT MOST one message per frame
    // (unthrottled mousemove/scroll spammed the worker every event = main-thread
    // churn). The worker smooths these values internally, so one sample/frame
    // is plenty.
    let rafScroll = 0;
    let rafMouse = 0;
    let pendingScroll = 0;
    let pendingMouse: { x: number; y: number } | null = null;

    const onScroll = () => {
      pendingScroll = window.scrollY;
      if (rafScroll) return;
      rafScroll = requestAnimationFrame(() => {
        rafScroll = 0;
        worker.postMessage({ type: "scroll", scrollPx: pendingScroll });
        syncVisible();
      });
    };
    const onMouse = (e: MouseEvent) => {
      pendingMouse = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
      if (rafMouse) return;
      rafMouse = requestAnimationFrame(() => {
        rafMouse = 0;
        if (pendingMouse)
          worker.postMessage({ type: "mouse", x: pendingMouse.x, y: pendingMouse.y });
      });
    };
    const onResize = () =>
      worker.postMessage({ type: "resize", width: window.innerWidth, height: window.innerHeight });
    const onVisibility = () => syncVisible();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    // Apply the correct initial state (landing on the home hero starts
    // occluded → paused until the first scroll past it).
    syncVisible();

    // Safety re-sync: this component lives in the persistent layout, so a
    // client-side route change (e.g. home-top, where we're paused → another
    // page) does NOT re-run this effect. Scroll/mouse usually re-sync it, but
    // a pointer-less nav could otherwise leave the galaxy paused on the new
    // page. A cheap poll (computeVisible only posts on an actual change)
    // guarantees correctness without coupling to the router.
    const visTimer = setInterval(syncVisible, 600);

    return () => {
      clearInterval(visTimer);
      if (rafScroll) cancelAnimationFrame(rafScroll);
      if (rafMouse) cancelAnimationFrame(rafMouse);
      worker.postMessage({ type: "destroy" });
      worker.terminate();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="rg-ambient-bg pointer-events-none fixed inset-0 z-0"
      // Contain the full-viewport `mix-blend-screen` canvas to its OWN
      // compositing group. Without isolation the screen blend forces the
      // browser off its fast compositor path for the whole page, so every
      // composited frame (including ones driven only by the moving cursor)
      // gets more expensive. Isolating it lets the rest of the page — and the
      // top-layer custom cursor — composite cheaply again. Visually a no-op
      // here: the only thing behind this backmost layer is the near-black body
      // bg (#06030f), so screen-blended vs isolated is indistinguishable.
      style={{ isolation: "isolate" }}
    >
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
        className="absolute inset-0 galaxy-bg-pulse"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 30% 20%, rgba(245,185,69,0.16), transparent 55%)," +
            "radial-gradient(ellipse 80% 60% at 75% 80%, rgba(167,139,250,0.26), transparent 55%)," +
            "linear-gradient(180deg, #0b0820 0%, #1a0e3a 35%, #0a0820 70%, #07061a 100%)",
          backgroundSize: "180% 180%, 200% 200%, 100% 280%",
          animation: "bgPulseSlow 22s ease-in-out infinite",
        }}
      />
      {/* v6.14.6 — REMOVED radial vignette overlay. Previously a fixed
            radial gradient hit solid rgb(5,6,10) at its outer edge, which
            on mobile painted a visible dark BAR across the bottom of the
            viewport (because the ellipse is centered at 50% 45% and its
            bottom-edge stop is fully opaque). User reported repeatedly as
            "bar on the bottom". Removed entirely — per-section text uses
            its own contrast (text-shadow / per-element backgrounds), so
            this global vignette is unnecessary. */}
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
