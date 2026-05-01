"use client";
import { useEffect, useState } from "react";
import { useCosmicScene } from "@/lib/cosmic-scene";

/**
 * Page-wide cosmic backdrop overlay for the home page.
 *
 * All cinematic decoration (planet, halo, nebulas, warp streaks,
 * orbital rings, constellation dots) is now rendered by the shared
 * Web-Worker WebGL canvas in <GalaxyBackground/>. This component just
 * activates the 'home' scene for the duration of the home page and
 * paints a soft DOM vignette to keep mid-page text legible.
 *
 * Removed in this rewrite:
 *   • Desktop CSS orb stack (4 × 50vh blurred radial-gradients with
 *     mix-blend-mode:screen + filter:blur(120px) — extreme compositor
 *     cost on mobile and unnecessary now that the WebGL nebula clouds
 *     are full-spec on every viewport).
 *   • Mobile lite-nebula stack (3 large drifting CSS gradients) and
 *     the 35 individually-positioned twinkling DOM stars. The worker
 *     now bumps mobile to 1500 in-canvas stars + 3 GLSL fbm-noise
 *     nebulas + warp streaks, all on the GPU. This was previously
 *     rendered in the DOM because the worker was under-utilised on
 *     mobile (only 160 stars). With the worker rebuilt that fallback
 *     is no longer needed and removing it eliminates the last
 *     scroll-time recomposite of a 3-layer mobile stack.
 *
 * Net effect: zero per-scroll repaint cost from this component on
 * mobile, while the visual richness goes UP (real WebGL nebulas vs
 * blurred CSS gradients).
 */
export default function HomeBackground() {
  // Activate the worker's "home" scene (planet + halo + nebulas +
  // warp streaks) for as long as this component is mounted.
  useCosmicScene("home");

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
      {/* Soft vignette that keeps the centre of the page legible.
          This is the ONLY paint now — the rest is GPU/WebGL. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(4,3,12,0.45) 100%)",
        }}
      />
    </div>
  );
}
