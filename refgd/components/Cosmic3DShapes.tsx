"use client";

import { useEffect, useState } from "react";

/**
 * Cosmic3DShapes — three slowly-rotating 3D wireframe shapes that
 * float in the page background, lending the home experience a
 * subtle "you're inside a 3D scene" depth.
 *
 *   • Wireframe CUBE         — top-right
 *   • Gyroscope / atom rings — middle-left
 *   • Octahedron-ish diamond — lower-right
 *
 * All three are CSS-only primitives defined in globals.css. The
 * rotation runs entirely on the GPU compositor — zero JS work, so
 * it stays smooth even on mobile and never competes with native
 * scrolling.
 *
 * Rendered as a fixed full-viewport layer below the page content
 * (z-1) so each shape is visible across every chapter as the user
 * scrolls. `pointer-events:none` makes it inert.
 *
 * Mobile path: smaller sizes (so the shapes don't dominate a
 * narrow viewport) and the cube + gyro only — the diamond is
 * dropped on mobile to keep the active layer count low.
 */
export default function Cosmic3DShapes() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!mounted) return null;
  // Mobile lag fix: 3D wireframe shapes were already de-animated
  // on mobile (globals.css gates the keyframes off at <=768px) but
  // their 12+ static compositor layers still cost the GPU on every
  // scroll frame. Drop the entire layer on mobile so scrolling +
  // the path cards have the full GPU budget to themselves.
  if (isMobile) return null;

  // Sizes tuned per breakpoint
  const cubeSize = isMobile ? 70 : 130;
  const gyroSize = isMobile ? 90 : 170;
  const pyrSize  = isMobile ? 80 : 150;

  return (
    <div
      aria-hidden="true"
      data-testid="cosmic-3d-shapes"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      style={{ contain: "layout paint" }}
    >
      {/* Cube — top-right */}
      <div
        className="shape-3d-stage"
        style={{
          right: isMobile ? "6%" : "8%",
          top: isMobile ? "12%" : "14%",
          width: cubeSize,
          height: cubeSize,
          opacity: 0.55,
          animationDelay: "0s",
        }}
      >
        <div
          className="shape-cube"
          style={{ ["--half" as any]: `${cubeSize / 2}px` }}
        >
          <div className="face face-f" />
          <div className="face face-b" />
          <div className="face face-r" />
          <div className="face face-l" />
          <div className="face face-t" />
          <div className="face face-d" />
        </div>
      </div>

      {/* Gyroscope — middle-left */}
      <div
        className="shape-3d-stage"
        style={{
          left: isMobile ? "-3%" : "4%",
          top: isMobile ? "44%" : "42%",
          width: gyroSize,
          height: gyroSize,
          opacity: 0.65,
          animationDelay: "1.4s",
        }}
      >
        <div className="shape-gyro">
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
          <div className="core" />
        </div>
      </div>

      {/* Octahedron diamond — lower-right (desktop only) */}
      {!isMobile && (
        <div
          className="shape-3d-stage"
          style={{
            right: "10%",
            bottom: "16%",
            width: pyrSize,
            height: pyrSize,
            opacity: 0.5,
            animationDelay: "2.8s",
          }}
        >
          <div className="shape-pyr">
            <div className="plane plane-1" />
            <div className="plane plane-2" />
            <div className="plane plane-3" />
          </div>
        </div>
      )}
    </div>
  );
}
