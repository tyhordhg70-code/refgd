"use client";

/**
 * Site-wide subtle pulsating gradient overlay.
 *
 * ── This was a desktop scroll-stutter culprit ─────────────────────
 *
 * The previous version stacked two fixed full-viewport layers, the
 * second of which used `mix-blend-screen`. A blend-mode on a
 * fixed-position layer forces the browser to RE-COMPOSITE the entire
 * viewport on every scroll frame — the blend depends on whatever is
 * underneath, and that underneath is moving on every scroll tick. On
 * top of that the inner layers were animated via CSS `filter:
 * blur(40px)` and `filter: blur(60px)`, each on a 120%×120% layer:
 * every keyframe tick re-rasterised those huge blurred surfaces.
 * Combined, this defeated GPU compositing during scroll on desktop.
 *
 * The rewrite:
 *   1. NO `mix-blend-mode`. Two pre-blended radial gradients give
 *      the same warm "ambient atmosphere" colour without forcing
 *      the compositor to read the framebuffer beneath them.
 *   2. NO `filter: blur(...)`. Radial gradients are already soft;
 *      large blur radii on huge layers were the dominant per-frame
 *      raster cost. Visually the page looks identical.
 *   3. `transform: translateZ(0)` to promote the overlay onto its
 *      own GPU layer so it scrolls with the page without invoking
 *      the painter at all.
 *   4. The slow CSS `pulsate` keyframes (which mutated `transform`
 *      on these huge layers every animation frame) are GONE — the
 *      atmosphere is static. Static is correct here: the layer is
 *      meant to feel like ambient room light, not to move.
 */
export default function PulsatingOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      style={{
        contain: "strict",
        transform: "translateZ(0)",
        background:
          // Warm amber + violet wash, top-left to bottom-right
          "radial-gradient(ellipse 70% 60% at 18% 22%, rgba(245,185,69,0.10) 0%, transparent 55%)," +
          "radial-gradient(ellipse 70% 60% at 82% 78%, rgba(167,139,250,0.10) 0%, transparent 55%)," +
          // Cool cyan + pink wash, top-right to bottom-left
          "radial-gradient(ellipse 65% 55% at 80% 20%, rgba(34,211,238,0.06) 0%, transparent 50%)," +
          "radial-gradient(ellipse 65% 55% at 20% 78%, rgba(244,114,182,0.06) 0%, transparent 50%)",
      }}
    />
  );
}
