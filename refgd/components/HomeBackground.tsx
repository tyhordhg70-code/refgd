"use client";
import { useEffect, useState, type CSSProperties } from "react";

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
 *
 * ── Mobile ────────────────────────────────────────────────────────
 * The orbs use `mix-blend-mode: screen` + `filter: blur(120px)` on a
 * fixed full-viewport layer — that combo is the same compositor
 * killer pattern we removed from PulsatingOverlay. On mobile GPUs
 * this forces a full-viewport recomposite on every scroll frame.
 * The galaxy WebGL background + the per-section gradients already
 * provide plenty of cosmic colour on mobile, so we drop the orbs
 * entirely on viewports ≤ 768 px and keep only the vignette.
 */
export default function HomeBackground() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
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

      {/* Orbs animate purely via .orb CSS keyframes — see globals.css.
          Skipped on mobile to drop a full-viewport mix-blend + 120px
          blur stack that the mobile compositor cannot afford. */}
      {!isMobile && (
        <>
          <div className="orb orb-1 absolute left-[6%] top-[8%] h-[55vh] w-[55vh] rounded-full" />
          <div className="orb orb-2 absolute right-[4%] top-[18%] h-[50vh] w-[50vh] rounded-full" />
          <div className="orb orb-3 absolute left-[30%] top-[55%] h-[48vh] w-[48vh] rounded-full" />
          <div className="orb orb-4 absolute right-[24%] top-[78%] h-[40vh] w-[40vh] rounded-full" />
        </>
      )}

      {/* ── Mobile lightweight star field ──
          Replaces the WebGL Galaxy + the heavy orb stack for the
          phone. ~24 absolutely-positioned 1-3 px white dots, each
          one running a SLOW opacity twinkle keyframe (`.lite-star`).
          Opacity is a compositor-only property — the GPU advances
          the keyframe value on its own thread without ever
          waking up the main thread or triggering paint. Total
          per-frame cost: roughly the same as 24 static divs.
          Distributes across the full document height (350vh) so
          the field follows the user as they scroll the page. */}
      {isMobile && (
        <div className="absolute inset-x-0 top-0" style={{ height: "350vh" }}>
          {Array.from({ length: 24 }).map((_, i) => {
            // Deterministic pseudo-random distribution.
            const seed = i * 9301 + 49297;
            const left = (seed * 13) % 100;
            const topPct = (seed * 7) % 100;
            const sizeRaw = (seed * 3) % 30;
            const size = 1 + (sizeRaw % 3); // 1-3 px
            const dur = 4 + ((seed >> 3) % 5); // 4-8 s
            const delay = ((seed >> 5) % 50) / 10; // 0-5 s
            const tint =
              i % 5 === 0
                ? "rgba(255, 215, 130, 0.95)"  // warm gold accent
                : i % 7 === 0
                  ? "rgba(180, 200, 255, 0.95)" // cool blue accent
                  : "#ffffff";
            return (
              <span
                key={i}
                className="lite-star"
                style={
                  {
                    left: `${left}%`,
                    top: `${topPct}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    background: tint,
                    boxShadow: `0 0 ${size * 3}px ${tint}`,
                    "--lite-star-dur": `${dur}s`,
                    "--lite-star-delay": `${delay}s`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
