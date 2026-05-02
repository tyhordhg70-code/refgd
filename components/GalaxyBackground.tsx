"use client";
import { useEffect, useRef, useState } from "react";
import {
  _registerCosmicScenePusher,
  _unregisterCosmicScenePusher,
} from "@/lib/cosmic-scene";

/**
 * Site-wide animated galaxy / particle field.
 *
 * Architecture: Three.js runs entirely in a Web Worker with an OffscreenCanvas
 * so the main JavaScript thread is NEVER blocked by WebGL draw calls.
 * The main thread sends lightweight postMessages for scroll/mouse/resize events.
 * The worker renders at adaptive FPS — see worker file for current budgets.
 *
 * In addition to the always-on `globalField` (the cosmic point cloud),
 * the worker now hosts MULTIPLE per-page scenes: home (planet + halo +
 * nebulas + warp streaks), chapter (orbital rings + dots), mentorship,
 * evade, store. Pages activate the scenes they need via the
 * `useCosmicScene(name)` hook in `lib/cosmic-scene.ts`. This component
 * is the bridge: it registers a pusher with that module which forwards
 * the active scene set to the worker as `{type:'scene', active:[…]}`.
 *
 * Fallback: if OffscreenCanvas is unavailable (rare — Safari < 17.4),
 * the worker is skipped and `useCosmicScene` calls become no-ops. A
 * static gradient still provides depth so the page is not visually broken.
 */
export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Bumping `mountKey` forces React to unmount + remount the <canvas>
  // element. We bump it whenever a previous effect cleaned up, so the
  // StrictMode dev double-mount and HMR reloads always get a *fresh*
  // canvas instead of trying to call transferControlToOffscreen() on
  // an already-transferred one (which throws InvalidStateError and
  // would leave the page with no animated background).
  const [mountKey, setMountKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // OffscreenCanvas not available in very old browsers / Safari < 17.4.
    // In that case simply don't render — the static gradient still looks fine.
    if (typeof (canvas as any).transferControlToOffscreen !== "function") return;

    let offscreen: OffscreenCanvas;
    try {
      offscreen = (canvas as any).transferControlToOffscreen() as OffscreenCanvas;
    } catch {
      // The canvas was already transferred (StrictMode / HMR replay).
      // Schedule a remount with a fresh canvas element on the next tick
      // so the next effect run can transfer control of a clean node.
      queueMicrotask(() => setMountKey((k) => k + 1));
      return;
    }
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

    // Relay the worker's "ready" signal (sent once shaders are compiled
    // and a warmup frame has rendered) into the `refgd:scene-ready`
    // window event. The LoadingScreen overlay waits for this event
    // before fading out, so the very first frame the user sees of the
    // cosmos is fully warm — no shader-compile jank, no missing planet.
    const onWorkerMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "ready") {
        window.dispatchEvent(new Event("refgd:scene-ready"));
      }
    };
    worker.addEventListener("message", onWorkerMessage);

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

    // Bridge: pages call useCosmicScene('home') etc., which routes
    // through cosmic-scene.ts → this pusher → the worker.
    const pushScenes = (names: string[]) =>
      worker.postMessage({ type: "scene", active: names });
    _registerCosmicScenePusher(pushScenes);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      _unregisterCosmicScenePusher(pushScenes);
      worker.removeEventListener("message", onWorkerMessage);
      worker.postMessage({ type: "destroy" });
      worker.terminate();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // Re-run when `mountKey` bumps so we attach to the freshly-mounted
    // canvas after a StrictMode/HMR transfer-already-happened recovery.
  }, [mountKey]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      {/* WebGL canvas — control is transferred to the Web Worker.
          `key={mountKey}` makes React mount a brand-new <canvas> when
          we detect the previous one was already transferred. */}
      <canvas
        key={mountKey}
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
      {/*
        Bottom vignette darkens the lower 55vh of the galaxy so
        foreground text/cards read on top of stars. Endpoint MUST
        match body `bg-ink-950` (#05060a) — previously this gradient
        ended at `rgb(10,12,20)` (ink-900, #0a0c14). The 4-point
        lightness step between this fixed-position vignette and the
        body bg below the page rendered as a visible
        slightly-lighter horizontal band sliding around the viewport
        as the user scrolled. The user reported this as a "black
        strip when scrolling down on home page". Aligning the
        gradient stops to #050609 / #05060a removes the step.
      */}
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
