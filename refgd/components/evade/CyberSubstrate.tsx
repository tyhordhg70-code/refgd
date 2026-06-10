"use client";

/**
 * CyberSubstrate — page-wide cosmic background for the Evade page.
 *
 * "Aurora Deep-Field": a deep-space scene built from a rich static cosmic
 * gradient, two slowly-drifting aurora ribbons, a layered starfield, a
 * receding synthwave grid horizon, and one slow light sweep. Replaces the
 * earlier dot-matrix + corner-radar look with something richer but still
 * lightweight.
 *
 * Perf budget (owner is lag-sensitive):
 *   - base / stars-far / grid / vignette ... STATIC (zero runtime cost)
 *   - aurora A + aurora B .................. transform-only drift (desktop)
 *   - stars-near twinkle .................. opacity-only (desktop)
 *   - light sweep ......................... transform + opacity (desktop)
 * That's at most 4 composite-only animations on desktop and ZERO on mobile.
 * No animated filter / backdrop-filter / background-position anywhere.
 */
export default function CyberSubstrate() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -4 }}
      >
        <div className="ev-cs-base" />
        <div className="ev-cs-aurora ev-cs-aurora-a hidden lg:block" />
        <div className="ev-cs-aurora ev-cs-aurora-b hidden lg:block" />
        <div className="ev-cs-stars ev-cs-stars-far" />
        <div className="ev-cs-stars ev-cs-stars-near hidden lg:block" />
        <div className="ev-cs-grid hidden lg:block" />
        <div className="ev-cs-sweep hidden lg:block" />
        <div className="ev-cs-vignette" />
      </div>

      <style>{`
        .ev-cs-base {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 18% 12%, rgba(34,211,238,0.20), transparent 60%),
            radial-gradient(ellipse 58% 55% at 82% 18%, rgba(124,92,255,0.24), transparent 62%),
            radial-gradient(ellipse 64% 60% at 80% 88%, rgba(34,211,238,0.14), transparent 64%),
            radial-gradient(ellipse 72% 62% at 26% 92%, rgba(244,114,182,0.12), transparent 66%),
            linear-gradient(180deg, #04050b 0%, #060813 60%, #04050b 100%);
        }

        /* Drifting aurora ribbons — soft radial glows, transform-only. */
        .ev-cs-aurora { position: absolute; border-radius: 50%; opacity: 0.55; will-change: transform; }
        .ev-cs-aurora-a {
          left: -12%; top: -18%;
          width: 70vw; height: 60vw; max-width: 1000px; max-height: 820px;
          background: radial-gradient(ellipse at 50% 50%, rgba(34,211,238,0.42), rgba(34,211,238,0.10) 42%, transparent 68%);
          animation: evCsAuroraA 26s ease-in-out infinite alternate;
        }
        .ev-cs-aurora-b {
          right: -14%; bottom: -20%;
          width: 76vw; height: 64vw; max-width: 1100px; max-height: 880px;
          background: radial-gradient(ellipse at 50% 50%, rgba(124,92,255,0.40), rgba(244,114,182,0.10) 44%, transparent 70%);
          animation: evCsAuroraB 32s ease-in-out infinite alternate;
        }
        @keyframes evCsAuroraA {
          0%   { transform: translate3d(0,0,0) scale(1); }
          100% { transform: translate3d(6vw,4vh,0) scale(1.14); }
        }
        @keyframes evCsAuroraB {
          0%   { transform: translate3d(0,0,0) scale(1.06); }
          100% { transform: translate3d(-7vw,-4vh,0) scale(0.94); }
        }

        /* Layered starfield — static tiled dots, masked to the upper field. */
        .ev-cs-stars {
          position: absolute; inset: 0;
          -webkit-mask-image: radial-gradient(ellipse 100% 92% at 50% 36%, black 30%, transparent 92%);
                  mask-image: radial-gradient(ellipse 100% 92% at 50% 36%, black 30%, transparent 92%);
        }
        .ev-cs-stars-far {
          background-image:
            radial-gradient(1.4px 1.4px at 20% 30%, rgba(255,255,255,0.7), transparent 60%),
            radial-gradient(1.2px 1.2px at 70% 60%, rgba(180,230,255,0.6), transparent 60%),
            radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.5), transparent 60%),
            radial-gradient(1.2px 1.2px at 88% 22%, rgba(200,200,255,0.55), transparent 60%);
          background-size: 380px 380px, 300px 300px, 260px 260px, 420px 420px;
          opacity: 0.7;
        }
        .ev-cs-stars-near {
          background-image:
            radial-gradient(1.8px 1.8px at 15% 50%, #ffffff, transparent 60%),
            radial-gradient(2px 2px at 60% 20%, #bfe9ff, transparent 60%),
            radial-gradient(1.6px 1.6px at 85% 75%, #ffffff, transparent 60%);
          background-size: 520px 520px, 460px 460px, 600px 600px;
          opacity: 0.9;
          animation: evCsTwinkle 6s ease-in-out infinite;
          will-change: opacity;
        }
        @keyframes evCsTwinkle {
          0%,100% { opacity: 0.55; }
          50%     { opacity: 0.95; }
        }

        /* Receding synthwave grid horizon (static). */
        .ev-cs-grid {
          position: absolute; left: -25%; right: -25%; bottom: -12%; height: 60vh;
          background-image:
            linear-gradient(rgba(34,211,238,0.22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,92,255,0.16) 1px, transparent 1px);
          background-size: 64px 64px, 64px 64px;
          transform: perspective(420px) rotateX(66deg);
          transform-origin: 50% 100%;
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, black 60%, black 100%);
                  mask-image: linear-gradient(180deg, transparent 0%, black 60%, black 100%);
          opacity: 0.45;
        }

        /* One slow diagonal light sweep. */
        .ev-cs-sweep {
          position: absolute; top: -40%; left: -30%; width: 50%; height: 180%;
          background: linear-gradient(105deg, transparent 40%, rgba(125,231,255,0.06) 50%, transparent 60%);
          animation: evCsSweep 16s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes evCsSweep {
          0%   { transform: translate3d(-30%,0,0) rotate(8deg); opacity: 0; }
          50%  { opacity: 1; }
          100% { transform: translate3d(260%,0,0) rotate(8deg); opacity: 0; }
        }

        .ev-cs-vignette {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 120% 80% at 50% 45%, transparent 52%, rgba(2,3,8,0.88) 100%),
            linear-gradient(180deg, rgba(2,3,8,0.55), transparent 20%, transparent 76%, rgba(2,3,8,0.8));
        }

        @media (hover: none) and (max-width: 1366px) {
          .ev-cs-aurora, .ev-cs-grid, .ev-cs-sweep, .ev-cs-stars-near { display: none !important; }
        }
        @media (max-width: 699px) {
          .ev-cs-stars-far { opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ev-cs-aurora, .ev-cs-stars-near, .ev-cs-sweep { animation: none !important; }
        }
      `}</style>
    </>
  );
}
