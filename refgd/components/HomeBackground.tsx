"use client";
import { useEffect, useState } from "react";

/**
 * Page-wide animated cosmic background for the home page.
 *
 * Renders a family of gradient orbs that drift behind every chapter
 * via PURE CSS keyframe animations — no scroll listeners, no
 * useTransform hooks, no per-frame re-render. The orbs already
 * float and pulse via their `.orb` class, so the page-wide field
 * stays lively without paying the per-scroll repaint cost that was
 * causing the home page to feel laggy.
 *
 * Sits between <GalaxyBackground/> (z-0) and the page content (z-2).
 */
export default function HomeBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="home-background"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {/* Soft vignette that keeps the centre of the page legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(4,3,12,0.45) 100%)",
        }}
      />

      {/* Orbs animate purely via .orb CSS keyframes — see globals.css. */}
      <div className="orb orb-1 absolute left-[6%] top-[8%] h-[55vh] w-[55vh] rounded-full" />
      <div className="orb orb-2 absolute right-[4%] top-[18%] h-[50vh] w-[50vh] rounded-full" />
      <div className="orb orb-3 absolute left-[30%] top-[55%] h-[48vh] w-[48vh] rounded-full" />
      <div className="orb orb-4 absolute right-[24%] top-[78%] h-[40vh] w-[40vh] rounded-full" />
    </div>
  );
}
