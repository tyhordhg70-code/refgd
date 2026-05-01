"use client";
import { useCosmicScene } from "@/lib/cosmic-scene";

/**
 * Cosmic accent rendered behind the Chapter 01 heading on the home
 * page. All visuals (orbital rings, constellation dots, twinkling
 * starfield) are now rendered by the worker's "chapter" scene
 * activated via `useCosmicScene`. This component only exists to flip
 * the scene on while it's mounted — render output is empty.
 *
 * Removed in this rewrite:
 *   • 24 absolutely-positioned `.telegram-star` spans with CSS
 *     keyframe opacity twinkles spread across the section
 *   • 3 large rounded-rect divs with inset box-shadows for the
 *     orbital rings (these are now `RingGeometry` in the worker)
 *   • 5 `.constellation-dot` spans with double box-shadow glows
 *
 * The worker scene replicates all three layers in a single WebGL
 * draw pass: instanced point sprites for the stars, ring geometry
 * for the orbits, additive plane meshes for the dots — all
 * additively blended over the global cosmic point cloud.
 */
export default function ChapterCosmos() {
  useCosmicScene("chapter");
  return null;
}
