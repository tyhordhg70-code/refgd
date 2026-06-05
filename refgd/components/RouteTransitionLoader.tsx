"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  heavyAssetsForPath,
  pathHasScene,
  downloadHeavyAssets,
} from "@/lib/asset-preloader";

/**
 * RouteTransitionLoader — a cosmic splash shown on CLIENT-SIDE navigation
 * to a heavy page so the destination's large assets (the home Spline
 * galaxy, the evade cinematic scene) are fully downloaded / warmed and
 * the scene has painted BEFORE the page is revealed.
 *
 * The initial full-page boot is owned by <LoadingScreen>; this component
 * skips its first render and only engages on subsequent route changes.
 * Light routes (no heavy asset, no cinematic scene) never trigger it, so
 * normal navigation stays instant.
 */
export default function RouteTransitionLoader() {
  const pathname = usePathname();
  const firstRef = useRef(true);
  const prevPathRef = useRef(pathname);
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Skip the very first mount — <LoadingScreen> handles initial load.
    if (firstRef.current) {
      firstRef.current = false;
      prevPathRef.current = pathname;
      return;
    }
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    const assets = heavyAssetsForPath(pathname);
    const hasScene = pathHasScene(pathname);
    // Light route — reveal immediately, no overlay.
    if (assets.length === 0 && !hasScene) return;

    let cancelled = false;
    const ac = new AbortController();
    setProgress(assets.length === 0 ? 12 : 0);
    setActive(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Wait for the cinematic scene's first painted frame (if any).
    const sceneReadyPromise = new Promise<void>((resolve) => {
      if (!hasScene) return resolve();
      window.addEventListener("refgd:scene-ready", () => resolve(), {
        once: true,
      });
    });

    // Fully download any heavy remote asset, tracking real progress.
    const dlPromise = downloadHeavyAssets(
      assets,
      (f) => {
        if (!cancelled) setProgress(Math.max(12, Math.round(f * 100)));
      },
      ac.signal,
    );

    // Dead-network / missing-event backstop so navigation can never hang.
    const safety = new Promise<void>((r) =>
      window.setTimeout(r, hasScene ? 18000 : 9000),
    );

    Promise.race([
      Promise.all([dlPromise, sceneReadyPromise]).then(() => undefined),
      safety,
    ]).then(() => {
      if (cancelled) return;
      setProgress(100);
      window.setTimeout(() => {
        if (cancelled) return;
        setActive(false);
        document.body.style.overflow = prevOverflow;
      }, 360);
    });

    return () => {
      cancelled = true;
      ac.abort();
      document.body.style.overflow = prevOverflow;
    };
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background:
          "radial-gradient(ellipse at 30% 30%, #1b1340 0%, #0a0c1a 55%, #000 100%)",
        display: "grid",
        placeItems: "center",
        opacity: active ? 1 : 0,
        transition: "opacity 360ms cubic-bezier(0.65, 0, 0.35, 1)",
        willChange: "opacity",
        transform: "translateZ(0)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 22% 28%, rgba(167,139,250,0.28), transparent 45%)," +
            "radial-gradient(circle at 78% 70%, rgba(34,211,238,0.22), transparent 50%)," +
            "radial-gradient(circle at 50% 100%, rgba(245,185,69,0.18), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: 360,
          padding: "0 24px",
        }}
      >
        <div
          className="pulse-glow-violet"
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 84,
            height: 84,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,225,140,0.42), rgba(167,139,250,0.22) 55%, transparent 100%)",
            border: "1px solid rgba(255,225,140,0.35)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', Geist, system-ui, sans-serif",
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "-0.04em",
              background:
                "linear-gradient(135deg, #ffe28a 0%, #ffffff 50%, #a78bfa 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
            }}
          >
            RG
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 240,
            height: 2,
            margin: "0 auto",
            background: "rgba(255,255,255,0.10)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, #ffe28a, #a78bfa 50%, #67e8f9)",
              borderRadius: 2,
              boxShadow: "0 0 14px rgba(167,139,250,0.85)",
              transition: "width 260ms cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "width",
            }}
          />
        </div>

        <p
          style={{
            fontFamily: "Geist, system-ui, sans-serif",
            fontSize: 10,
            color: "rgba(255,255,255,0.55)",
            margin: 0,
            marginTop: 14,
            letterSpacing: "0.22em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {progress}%
        </p>
      </div>
    </div>
  );
}
