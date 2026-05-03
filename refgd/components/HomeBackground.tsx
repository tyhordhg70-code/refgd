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

          {/* v6.13.53 — Animated abstract gradient particles + twinkling
              stars across the home background per user request. Both
              layers are GPU-only animations (opacity + transform) and
              only mount on desktop where we already pay the orb stack
              cost — mobile keeps its lite cosmic field below. */}
          <style>{`
            @keyframes hbDriftA { 0%,100% { transform: translate3d(0,0,0); opacity: 0.6; }
                                  50%      { transform: translate3d(8px,-18px,0); opacity: 0.95; } }
            @keyframes hbDriftB { 0%,100% { transform: translate3d(0,0,0); opacity: 0.4; }
                                  50%      { transform: translate3d(-12px,14px,0); opacity: 0.85; } }
            @keyframes hbDriftC { 0%,100% { transform: translate3d(0,0,0) scale(1);   opacity: 0.55; }
                                  50%      { transform: translate3d(-6px,-12px,0) scale(1.18); opacity: 1; } }
            @keyframes hbTwinkle { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
          `}</style>
          {/* Abstract gradient particles — 24, deterministic seeding so
              SSR + client agree. Mix of warm + cool tints, drift on a
              5-13 s cycle, blurred + screen-blended for cosmic dust. */}
          {Array.from({ length: 24 }).map((_, i) => {
            const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) + 1) / 2);
            const palette = [
              "radial-gradient(circle, rgba(245,185,69,0.85), transparent 70%)",
              "radial-gradient(circle, rgba(167,139,250,0.85), transparent 70%)",
              "radial-gradient(circle, rgba(34,211,238,0.80), transparent 70%)",
              "radial-gradient(circle, rgba(244,114,182,0.80), transparent 70%)",
            ];
            const anims = ["hbDriftA", "hbDriftB", "hbDriftC"];
            const size = 50 + Math.round(r(1) * 160);
            const left = (r(2) * 100).toFixed(2) + "%";
            const top = (r(3) * 100).toFixed(2) + "%";
            const dur = (5 + r(4) * 8).toFixed(2) + "s";
            const delay = (-r(5) * 8).toFixed(2) + "s";
            const bg = palette[Math.floor(r(6) * palette.length)];
            const anim = anims[Math.floor(r(7) * anims.length)];
            return (
              <span
                key={`hb-particle-${i}`}
                className="absolute rounded-full"
                style={{
                  left, top, width: size, height: size,
                  background: bg,
                  filter: "blur(28px)",
                  mixBlendMode: "screen",
                  animation: `${anim} ${dur} ease-in-out ${delay} infinite`,
                  willChange: "transform, opacity",
                }}
              />
            );
          })}
          {/* Twinkling stars — 60, opacity-only animation (cheapest
              compositor property). Sized 1-3 px with a soft glow. */}
          {Array.from({ length: 60 }).map((_, i) => {
            const seed = i * 9301 + 49297;
            const left = ((seed * 13) % 1000) / 10;
            const top = ((seed * 7) % 1000) / 10;
            const size = 1 + ((seed * 3) % 3);
            const dur = 3 + ((seed >> 3) % 5);
            const delay = ((seed >> 5) % 50) / 10;
            const accent = i % 6 === 0
              ? "rgba(255,215,130,0.95)"
              : i % 9 === 0
                ? "rgba(180,200,255,0.95)"
                : "#ffffff";
            return (
              <span
                key={`hb-star-${i}`}
                className="absolute rounded-full"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: accent,
                  boxShadow: `0 0 ${size * 4}px ${accent}`,
                  animation: `hbTwinkle ${dur}s ease-in-out ${delay}s infinite`,
                  willChange: "opacity",
                }}
              />
            );
          })}
        </>
      )}

      {/* ── Mobile cosmic field ──
          Replaces the WebGL Galaxy + the heavy orb stack for the
          phone with three layers of pure CSS:

          1. ~3 huge, very faint, slowly drifting NEBULA gradients.
             Each is a single radial-gradient div animated only on
             `transform: translate3d(...)` over 60-90 s. The GPU
             owns the entire animation; the main thread is never
             woken up. These give the page real depth, like soft
             clouds of coloured cosmic dust.

          2. ~50 small twinkling STARS. Each star animates only
             `opacity` (the cheapest property the compositor can
             animate). 50 of them cost roughly the same as 50
             static divs, but together they restore a real star
             field feel.

          3. A small set of warm/cool tinted ACCENT stars with a
             slightly larger glow, scattered through the field for
             visual interest.

          Distributed across 350 vh so the field follows the user
          down the entire page. */}
      {isMobile && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: "100vh",
            // Force the entire cosmic field into ONE cached
            // compositor layer. With this, the GPU rasterises the
            // nebulas + 35 stars exactly once and reuses the
            // bitmap for every subsequent frame — horizontal
            // scrolls of the path-card carousel above never
            // invalidate it. This is the actual performance fix
            // (the previous attempt promoted each star to its own
            // layer instead, which added compositor overhead).
            transform: "translateZ(0)",
            willChange: "transform",
            contain: "strict",
          }}
        >
          {/* Nebula 1 — warm violet, top half */}
          <div
            className="lite-nebula"
            style={
              {
                left: "-10%",
                top: "5vh",
                width: "120vw",
                height: "70vh",
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(180,90,255,0.22), rgba(120,60,220,0.08) 40%, transparent 70%)",
                "--nebula-dur": "75s",
                "--nebula-x": "10vw",
                "--nebula-y": "-4vh",
              } as CSSProperties
            }
          />
          {/* Nebula 2 — warm gold, mid */}
          <div
            className="lite-nebula"
            style={
              {
                right: "-15%",
                top: "90vh",
                width: "130vw",
                height: "80vh",
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(255,180,90,0.16), rgba(255,140,60,0.06) 45%, transparent 75%)",
                "--nebula-dur": "90s",
                "--nebula-x": "-12vw",
                "--nebula-y": "6vh",
              } as CSSProperties
            }
          />
          {/* Nebula 3 — cool teal, lower */}
          <div
            className="lite-nebula"
            style={
              {
                left: "-5%",
                top: "200vh",
                width: "120vw",
                height: "80vh",
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(70,180,220,0.18), rgba(40,120,200,0.06) 45%, transparent 75%)",
                "--nebula-dur": "80s",
                "--nebula-x": "8vw",
                "--nebula-y": "-5vh",
              } as CSSProperties
            }
          />

          {/* Star field — 35 dots (cached in single layer above) */}
          {Array.from({ length: 35 }).map((_, i) => {
            const seed = i * 9301 + 49297;
            const left = (seed * 13) % 100;
            const topPct = (seed * 7) % 100;
            const sizeRaw = (seed * 3) % 30;
            const size = 1 + (sizeRaw % 3); // 1-3 px
            const dur = 4 + ((seed >> 3) % 5); // 4-8 s
            const delay = ((seed >> 5) % 50) / 10; // 0-5 s
            const tint =
              i % 5 === 0
                ? "rgba(255, 215, 130, 0.95)" // warm gold accent
                : i % 7 === 0
                  ? "rgba(180, 200, 255, 0.95)" // cool blue accent
                  : "#ffffff";
            const glow = i % 5 === 0 || i % 7 === 0 ? size * 5 : size * 3;
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
                    boxShadow: `0 0 ${glow}px ${tint}`,
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
