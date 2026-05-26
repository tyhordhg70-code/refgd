"use client";

  /**
   * EvadeImmersiveBg — page-wide immersive 3D playground background for the
   * Evade Cancelations page. Replaces the previous flat gradient overlays
   * with a layered, parallax-aware 3D environment:
   *
   *   1. Deep animated nebula gradient (cosmic backdrop)
   *   2. Two sweeping aurora ribbons drifting in opposite directions
   *   3. CSS-perspective wireframe floor + ceiling (3D playground feel)
   *   4. 12 floating, glowing 3D shards that drift + rotate continuously
   *   5. 60 twinkling cosmic dust particles
   *
   * All layers are pure CSS / DOM — no WebGL, no canvas — so the runtime
   * cost stays in the GPU compositor.  Heavy animations (filter, aurora
   * sweep, shard rotation) are throttled or disabled below 1366 px to
   * prevent the iPad whole-page-repaint flicker class we hit earlier.
   */
  import { useMemo } from "react";

  export default function EvadeImmersiveBg() {
    const shards = useMemo(
      () =>
        Array.from({ length: 12 }, (_, i) => ({
          id: i,
          left: `${(i * 17 + 4) % 95}%`,
          top: `${(i * 23 + 8) % 90}%`,
          size: 38 + ((i * 11) % 70),
          delay: i * 0.9,
          duration: 18 + ((i * 3) % 14),
          hue: (["cyan", "violet", "amber", "fuchsia"] as const)[i % 4],
        })),
      [],
    );

    const dust = useMemo(
      () =>
        Array.from({ length: 60 }, (_, i) => ({
          id: i,
          left: `${(i * 13 + 5) % 100}%`,
          top: `${(i * 19 + 7) % 100}%`,
          delay: (i * 0.27) % 6,
          duration: 4 + (i % 6),
          size: 1 + (i % 3),
        })),
      [],
    );

    return (
      <>
        {/* Layer 0 — Deep animated nebula backdrop. Sits behind everything
            so the GalaxyBackground starfield still reads through subtle
            gaps in the gradient. */}
        <div
          aria-hidden="true"
          className="ev-imm-nebula pointer-events-none fixed -z-[8]"
          style={{ top: "-200px", bottom: "-200px", left: "-200px", right: "-200px" }}
        />

        {/* Layer 1 — Two diagonal aurora ribbons sweeping in opposite
            directions for continuous colour motion. */}
        <div aria-hidden="true" className="ev-imm-aurora-1 pointer-events-none fixed inset-0 -z-[7]" />
        <div aria-hidden="true" className="ev-imm-aurora-2 pointer-events-none fixed inset-0 -z-[7]" />

        {/* Layer 2 — CSS 3D wireframe floor (recedes into the distance). */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-0 -z-[6] hidden lg:block"
          style={{ height: "70vh", perspective: "1000px", perspectiveOrigin: "50% 100%" }}
        >
          <div className="ev-imm-floor" />
        </div>

        {/* Layer 3 — CSS 3D wireframe ceiling (recedes upward into the distance). */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 -z-[6] hidden lg:block"
          style={{ height: "70vh", perspective: "1000px", perspectiveOrigin: "50% 0%" }}
        >
          <div className="ev-imm-ceiling" />
        </div>

        {/* Layer 4 — 12 floating glowing 3D shards. */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden hidden lg:block">
          {shards.map((s) => (
            <div
              key={s.id}
              className={`ev-imm-shard ev-imm-shard-${s.hue}`}
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                animationDelay: `-${s.delay}s`,
                animationDuration: `${s.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Layer 5 — Twinkling cosmic dust. */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[4] overflow-hidden hidden lg:block">
          {dust.map((d) => (
            <span
              key={d.id}
              className="ev-imm-dust"
              style={{
                left: d.left,
                top: d.top,
                width: d.size,
                height: d.size,
                animationDelay: `-${d.delay}s`,
                animationDuration: `${d.duration}s`,
              }}
            />
          ))}
        </div>

        <style>{`
          /* ── Layer 0: deep nebula ───────────────────────────────────── */
          .ev-imm-nebula {
            background:
              radial-gradient(ellipse 70% 50% at 18% 22%, rgba(34,211,238,0.32), transparent 58%),
              radial-gradient(ellipse 65% 60% at 82% 28%, rgba(124,58,237,0.42), transparent 60%),
              radial-gradient(ellipse 60% 60% at 30% 78%, rgba(244,114,182,0.28), transparent 62%),
              radial-gradient(ellipse 70% 55% at 78% 82%, rgba(34,211,238,0.24), transparent 60%),
              radial-gradient(ellipse 55% 50% at 50% 50%, rgba(255,200,80,0.16), transparent 70%);
            animation: evImmNebDrift 30s ease-in-out infinite;
            
          }
          @keyframes evImmNebDrift {
            0%, 100% { transform: scale(1.08) translate3d(0,0,0); }
            50%      { transform: scale(1.16) translate3d(-2%, 1.5%, 0); }
          }
          @keyframes evImmNebHue {
            0%   { filter: hue-rotate(0deg) saturate(1.10); }
            50%  { filter: hue-rotate(30deg) saturate(1.28); }
            100% { filter: hue-rotate(0deg) saturate(1.10); }
          }

          /* ── Layer 1: aurora ribbons ────────────────────────────────── */
          .ev-imm-aurora-1, .ev-imm-aurora-2 {
            /* mix-blend-mode removed: WebKit stacking ctx bug */
          }
          .ev-imm-aurora-1 {
            background: linear-gradient(115deg,
              transparent 0%,
              rgba(34,211,238,0.16) 28%,
              rgba(124,58,237,0.24) 50%,
              rgba(244,114,182,0.18) 72%,
              transparent 100%);
            background-size: 220% 100%;
            animation: evImmAur1 14s linear infinite;
                      }
          .ev-imm-aurora-2 {
            background: linear-gradient(245deg,
              transparent 0%,
              rgba(167,139,250,0.16) 28%,
              rgba(34,211,238,0.20) 52%,
              rgba(255,200,80,0.14) 76%,
              transparent 100%);
            background-size: 300% 100%;
            animation: evImmAur2 22s linear infinite;
                      }
          @keyframes evImmAur1 {
            0%   { background-position: -100% 0; }
            100% { background-position:  200% 0; }
          }
          @keyframes evImmAur2 {
            0%   { background-position:  200% 0; }
            100% { background-position: -100% 0; }
          }

          /* ── Layer 2: 3D wireframe floor ─────────────────────────────── */
          .ev-imm-floor {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(124,58,237,0.55) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,211,238,0.55) 1px, transparent 1px);
            background-size: 64px 64px;
            transform: rotateX(70deg);
            transform-origin: bottom;
            -webkit-mask-image: linear-gradient(to top, black 5%, transparent 95%);
                    mask-image: linear-gradient(to top, black 5%, transparent 95%);
            animation: evImmGrid 8s linear infinite;
            opacity: 0.7;
          }
          /* ── Layer 3: 3D wireframe ceiling ───────────────────────────── */
          .ev-imm-ceiling {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(244,114,182,0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,200,80,0.35) 1px, transparent 1px);
            background-size: 80px 80px;
            transform: rotateX(-70deg);
            transform-origin: top;
            -webkit-mask-image: linear-gradient(to bottom, black 5%, transparent 95%);
                    mask-image: linear-gradient(to bottom, black 5%, transparent 95%);
            animation: evImmGrid 11s linear infinite reverse;
            opacity: 0.55;
          }
          @keyframes evImmGrid {
            0%   { background-position: 0 0, 0 0; }
            100% { background-position: 0 64px, 64px 0; }
          }

          /* ── Layer 4: floating 3D shards ─────────────────────────────── */
          .ev-imm-shard {
            position: absolute;
            border-radius: 8px;
            opacity: 0.42;
            mix-blend-mode: screen;
            animation-name: evImmShardFloat;
            animation-iteration-count: infinite;
            animation-timing-function: ease-in-out;
            
          }
          .ev-imm-shard-cyan {
            background: linear-gradient(135deg, rgba(34,211,238,0.55), rgba(34,211,238,0.08));
            box-shadow: 0 0 36px rgba(34,211,238,0.55), inset 0 0 18px rgba(34,211,238,0.35);
            border: 1px solid rgba(34,211,238,0.45);
          }
          .ev-imm-shard-violet {
            background: linear-gradient(135deg, rgba(167,139,250,0.55), rgba(124,58,237,0.08));
            box-shadow: 0 0 36px rgba(124,58,237,0.55), inset 0 0 18px rgba(167,139,250,0.35);
            border: 1px solid rgba(167,139,250,0.45);
          }
          .ev-imm-shard-amber {
            background: linear-gradient(135deg, rgba(255,200,80,0.55), rgba(245,185,69,0.08));
            box-shadow: 0 0 36px rgba(245,185,69,0.55), inset 0 0 18px rgba(255,200,80,0.35);
            border: 1px solid rgba(255,200,80,0.45);
          }
          .ev-imm-shard-fuchsia {
            background: linear-gradient(135deg, rgba(244,114,182,0.55), rgba(236,72,153,0.08));
            box-shadow: 0 0 36px rgba(236,72,153,0.55), inset 0 0 18px rgba(244,114,182,0.35);
            border: 1px solid rgba(244,114,182,0.45);
          }
          @keyframes evImmShardFloat {
            0%, 100% {
              transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
              opacity: 0.32;
            }
            25% {
              transform: translate3d(22px, -34px, 0) rotate(90deg) scale(1.10);
              opacity: 0.58;
            }
            50% {
              transform: translate3d(-18px, -56px, 0) rotate(180deg) scale(0.92);
              opacity: 0.42;
            }
            75% {
              transform: translate3d(26px, -28px, 0) rotate(270deg) scale(1.15);
              opacity: 0.62;
            }
          }

          /* ── Layer 5: twinkling dust ─────────────────────────────────── */
          .ev-imm-dust {
            position: absolute;
            border-radius: 50%;
            background: white;
            box-shadow: 0 0 6px rgba(255,255,255,0.85);
            animation-name: evImmDust;
            animation-iteration-count: infinite;
            animation-timing-function: ease-in-out;
            
          }
          @keyframes evImmDust {
            0%, 100% { opacity: 0.10; transform: scale(0.5); }
            50%      { opacity: 1;    transform: scale(1.6); }
          }

          /* ── Mobile + iPad: throttle the expensive layers ─────────────
           * Filter-on-fixed-element and dual aurora sweeps trip the same
           * compositor pressure that caused the iPad flicker we just fixed.
           * Disable the secondary aurora, kill the nebula hue rotation,
           * and slow the shard / grid animations so the page stays calm. */
          @media (hover: none) and (max-width: 1366px) {
            .ev-imm-nebula { animation: evImmNebDrift 40s ease-in-out infinite !important; }
            .ev-imm-aurora-2 { display: none; }
            .ev-imm-shard { animation-duration: 30s !important; }
            .ev-imm-floor { animation-duration: 15s !important; opacity: 0.45; }
            .ev-imm-ceiling { animation-duration: 18s !important; opacity: 0.35; }
          }
          /* Phones only — drop the ceiling entirely (the floor reads as
             the 3D playground; ceiling adds visual noise on small screens). */
          @media (hover: none) and (max-width: 699px) {
            .ev-imm-ceiling { display: none; }
            .ev-imm-shard { opacity: 0.32 !important; }
          }

          @media (prefers-reduced-motion: reduce) {
            .ev-imm-nebula, .ev-imm-aurora-1, .ev-imm-aurora-2,
            .ev-imm-floor, .ev-imm-ceiling, .ev-imm-shard, .ev-imm-dust {
              animation: none !important;
            }
          }
        `}</style>
      </>
    );
  }
  