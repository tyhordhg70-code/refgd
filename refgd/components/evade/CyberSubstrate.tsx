"use client";

/**
 * CyberSubstrate — page-wide threat-intelligence background for the
 * Evade page. Replaces EvadeImmersiveBg (which ran 72 animated nodes:
 * 12 shards + 60 dust, plus floor/ceiling/nebula).
 *
 * This is a deliberate NET REDUCTION in animated layers, because this
 * repo has a documented history of GPU-compositor saturation (cursor
 * lag) and an iPad whole-page-repaint flicker caused by animating CSS
 * `filter` on large fixed elements.
 *
 * Layer budget:
 *   - deep base gradient ............ STATIC
 *   - dot-matrix grid ............... STATIC (one repeating gradient)
 *   - vignette + edge glow .......... STATIC
 *   - radar sweep (corner) .......... 1 transform-only rotate (desktop)
 *   - scanline drift ................ 1 transform-only translate
 *   - 3 circuit traces + 3 packets .. desktop-only, stroke-dashoffset /
 *                                     offset-distance (each repaints
 *                                     only the SVG's own layer)
 * Everything heavy is gated behind `hidden lg:block`, killed under
 * 1366px touch devices, and disabled for prefers-reduced-motion.
 * No animated filter / backdrop-filter anywhere.
 */
export default function CyberSubstrate() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -4 }}
      >
        {/* Layer 0 — deep static base */}
        <div className="ev-cs-base" />

        {/* Layer 1 — static dot matrix */}
        <div className="ev-cs-dots" />

        {/* Layer 2 — static vignette */}
        <div className="ev-cs-vignette" />

        {/* Layer 3 — radar sweep, desktop only */}
        <div className="ev-cs-radar hidden lg:block" aria-hidden>
          <span className="ev-cs-radar-rings" />
          <span className="ev-cs-radar-sweep" />
        </div>

        {/* Layer 4 — single drifting scanline */}
        <div className="ev-cs-scan" />

        {/* Layer 5 — circuit traces + travelling data packets (desktop) */}
        <svg
          className="ev-cs-circuit hidden lg:block"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="evcs-trace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.0" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            className="ev-cs-trace ev-cs-trace-a"
            d="M-40 140 H260 l60 60 H560 l40 -40 H980"
          />
          <path
            className="ev-cs-trace ev-cs-trace-b"
            d="M1640 760 H1180 l-60 -60 H840 l-50 50 H520"
          />
          <path
            className="ev-cs-trace ev-cs-trace-c"
            d="M-40 460 H180 l70 -70 H470 l50 50 H760"
          />
          <circle r="3.2" className="ev-cs-packet">
            <animateMotion dur="6.5s" repeatCount="indefinite"
              path="M-40 140 H260 l60 60 H560 l40 -40 H980" />
          </circle>
          <circle r="2.6" className="ev-cs-packet ev-cs-packet-v">
            <animateMotion dur="8s" repeatCount="indefinite" begin="1.2s"
              path="M1640 760 H1180 l-60 -60 H840 l-50 50 H520" />
          </circle>
          <circle r="2.6" className="ev-cs-packet">
            <animateMotion dur="7.2s" repeatCount="indefinite" begin="2.4s"
              path="M-40 460 H180 l70 -70 H470 l50 50 H760" />
          </circle>
        </svg>
      </div>

      <style>{`
        .ev-cs-base {
          position: absolute; inset: -200px;
          background:
            radial-gradient(ellipse 60% 50% at 16% 14%, rgba(34,211,238,0.18), transparent 60%),
            radial-gradient(ellipse 55% 55% at 84% 22%, rgba(124,58,237,0.22), transparent 62%),
            radial-gradient(ellipse 60% 60% at 78% 86%, rgba(34,211,238,0.12), transparent 64%),
            radial-gradient(ellipse 70% 60% at 30% 90%, rgba(244,114,182,0.10), transparent 66%),
            #05060d;
        }
        /* Static perspective-less dot matrix — zero runtime cost. */
        .ev-cs-dots {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(rgba(125,231,255,0.18) 1px, transparent 1.4px),
            radial-gradient(rgba(167,139,250,0.10) 1px, transparent 1.4px);
          background-size: 46px 46px, 46px 46px;
          background-position: 0 0, 23px 23px;
          -webkit-mask-image: radial-gradient(ellipse 90% 80% at 50% 40%, black 30%, transparent 88%);
                  mask-image: radial-gradient(ellipse 90% 80% at 50% 40%, black 30%, transparent 88%);
          opacity: 0.6;
        }
        .ev-cs-vignette {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 120% 80% at 50% 50%, transparent 55%, rgba(3,4,10,0.85) 100%),
            linear-gradient(180deg, rgba(3,4,10,0.55), transparent 22%, transparent 78%, rgba(3,4,10,0.75));
        }

        /* Radar sweep — one rotating conic gradient (transform only). */
        .ev-cs-radar {
          position: absolute; top: -18vh; right: -14vw;
          width: 60vw; height: 60vw; max-width: 820px; max-height: 820px;
          opacity: 0.5;
        }
        .ev-cs-radar-rings {
          position: absolute; inset: 0; border-radius: 50%;
          background:
            radial-gradient(circle, transparent 0 24%, rgba(34,211,238,0.10) 24.4% 25%, transparent 25.4%),
            radial-gradient(circle, transparent 0 49%, rgba(34,211,238,0.08) 49.4% 50%, transparent 50.4%),
            radial-gradient(circle, transparent 0 74%, rgba(34,211,238,0.06) 74.4% 75%, transparent 75.4%);
        }
        .ev-cs-radar-sweep {
          position: absolute; inset: 0; border-radius: 50%;
          background: conic-gradient(from 0deg, rgba(34,211,238,0.0) 0deg, rgba(34,211,238,0.0) 300deg, rgba(34,211,238,0.28) 350deg, rgba(125,231,255,0.55) 360deg);
          -webkit-mask-image: radial-gradient(circle, black 0 76%, transparent 77%);
                  mask-image: radial-gradient(circle, black 0 76%, transparent 77%);
          animation: evCsRadar 7s linear infinite;
          will-change: transform;
        }
        @keyframes evCsRadar { to { transform: rotate(360deg); } }

        /* Single drifting horizontal scanline. */
        .ev-cs-scan {
          position: absolute; left: 0; right: 0; top: 0; height: 180px;
          background: linear-gradient(180deg, transparent, rgba(125,231,255,0.07) 45%, rgba(125,231,255,0.12) 50%, rgba(125,231,255,0.07) 55%, transparent);
          animation: evCsScan 9s linear infinite;
          will-change: transform;
        }
        @keyframes evCsScan {
          0% { transform: translate3d(0,-200px,0); }
          100% { transform: translate3d(0, 100vh, 0); }
        }

        /* Circuit traces — animate stroke-dashoffset only. No SVG filter. */
        .ev-cs-circuit { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.9; }
        .ev-cs-trace {
          fill: none; stroke: url(#evcs-trace); stroke-width: 1.4;
          stroke-dasharray: 14 12;
          animation: evCsFlow 4.5s linear infinite;
          will-change: stroke-dashoffset;
        }
        .ev-cs-trace-b { animation-duration: 5.5s; animation-direction: reverse; }
        .ev-cs-trace-c { animation-duration: 6.2s; }
        @keyframes evCsFlow { to { stroke-dashoffset: -260; } }
        .ev-cs-packet { fill: #7be7ff; }
        .ev-cs-packet-v { fill: #b196ff; }

        /* iPad / touch ≤1366px — drop the heavy desktop layers entirely
           and slow the cheap scanline so the compositor stays calm. */
        @media (hover: none) and (max-width: 1366px) {
          .ev-cs-radar, .ev-cs-circuit { display: none !important; }
          .ev-cs-scan { animation-duration: 16s; opacity: 0.6; }
        }
        @media (max-width: 699px) {
          .ev-cs-scan { display: none; }
          .ev-cs-dots { background-size: 38px 38px, 38px 38px; opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ev-cs-radar-sweep, .ev-cs-scan, .ev-cs-trace { animation: none !important; }
          .ev-cs-packet { display: none; }
        }
      `}</style>
    </>
  );
}
