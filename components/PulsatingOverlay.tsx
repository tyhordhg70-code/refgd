"use client";

/**
 * Site-wide subtle pulsating gradient overlay. Fixed-position, low
 * opacity, blends with multiply/screen so it warms every page without
 * obscuring content. Pointer-events:none so all clicks pass through.
 */
export default function PulsatingOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      style={{ contain: "strict" }}
    >
      <div className="pulsating-overlay-a absolute -inset-[20%] opacity-50" />
      <div className="pulsating-overlay-b absolute -inset-[20%] opacity-40 mix-blend-screen" />
    </div>
  );
}
