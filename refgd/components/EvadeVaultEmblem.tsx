/**
 * EvadeVaultEmblem — the animated "vault core" cyber emblem (reticle ring,
 * counter-rotating hex circuit, combination dial, orbiting nodes, radar
 * sweep, scan beam and the central shield-lock glyph). It was originally
 * the centerpiece of the Evade hero; the hero was decluttered to video +
 * text, so the emblem now lives in the "Evade like a PRO." dossier as the
 * framed evidence illustration (replacing the old static vault image).
 *
 * Pure CSS animation (no JS). The wrapper carries `data-anim-section` so
 * OffscreenGlowPauser freezes every infinite keyframe in this subtree
 * while it is scrolled out of view (anti-lag, especially on iPhone).
 * All layers (radar sweep, scan beam, orbit nodes) are visible on mobile
 * too — the orbit radius is scaled down on small screens so the nodes sit
 * on the rings; all motion is disabled under prefers-reduced-motion.
 */
export default function EvadeVaultEmblem({ className }: { className?: string }) {
  return (
    <div
      data-anim-section
      aria-hidden="true"
      className={`ev-vault-emblem${className ? " " + className : ""}`}
    >
      {/* breathing halo */}
      <span className="ev-vault-halo" />

      {/* radar sweep */}
      <span className="ev-vault-radar" />

      {/* outer reticle ring */}
      <div className="ev-vault-layer ev-vault-outer">
        <svg viewBox="0 0 400 400" className="ev-vault-svg">
          <circle cx="200" cy="200" r="194" className="ev-vault-ticks" />
          <circle cx="200" cy="200" r="176" className="ev-vault-ring-faint" />
          <path
            className="ev-vault-bracket"
            d="M200 12 v18 M200 388 v-18 M12 200 h18 M388 200 h-18"
          />
        </svg>
      </div>

      {/* mid hex frame + circuit (counter-rotating) */}
      <div className="ev-vault-layer ev-vault-mid">
        <svg viewBox="0 0 400 400" className="ev-vault-svg">
          <polygon
            className="ev-vault-hex"
            points="200,58 323,129 323,271 200,342 77,271 77,129"
          />
          <polygon
            className="ev-vault-hex-inner"
            points="200,96 290,148 290,252 200,304 110,252 110,148"
          />
          <path
            className="ev-vault-trace"
            d="M200 58 V20 M323 129 l34 -20 M323 271 l34 20 M200 342 V380 M77 271 l-34 20 M77 129 l-34 -20"
          />
          <circle className="ev-vault-vtx" cx="200" cy="58" r="4" />
          <circle className="ev-vault-vtx" cx="323" cy="129" r="4" />
          <circle className="ev-vault-vtx" cx="323" cy="271" r="4" />
          <circle className="ev-vault-vtx" cx="200" cy="342" r="4" />
          <circle className="ev-vault-vtx" cx="77" cy="271" r="4" />
          <circle className="ev-vault-vtx" cx="77" cy="129" r="4" />
        </svg>
      </div>

      {/* combination dial (rotating) */}
      <div className="ev-vault-layer ev-vault-dial">
        <svg viewBox="0 0 400 400" className="ev-vault-svg">
          <circle cx="200" cy="200" r="118" className="ev-vault-dial-ring" />
          <circle cx="200" cy="200" r="118" className="ev-vault-dial-ticks" />
          <path
            className="ev-vault-dial-arc"
            d="M200 82 A118 118 0 0 1 318 200"
          />
        </svg>
      </div>

      {/* orbiting data nodes (all viewports) */}
      <div className="ev-vault-layer ev-vault-orbit">
        <span className="ev-vault-node" style={{ ["--a" as any]: "0deg" }} />
        <span className="ev-vault-node" style={{ ["--a" as any]: "120deg" }} />
        <span className="ev-vault-node" style={{ ["--a" as any]: "240deg" }} />
      </div>
      <div className="ev-vault-layer ev-vault-orbit ev-vault-orbit-2">
        <span
          className="ev-vault-node ev-vault-node-sm"
          style={{ ["--a" as any]: "60deg" }}
        />
        <span
          className="ev-vault-node ev-vault-node-sm"
          style={{ ["--a" as any]: "200deg" }}
        />
      </div>

      {/* scan beam */}
      <span className="ev-vault-scan" />

      {/* core shield-lock glyph */}
      <div className="ev-vault-layer ev-vault-core">
        <svg viewBox="0 0 400 400" className="ev-vault-svg">
          <defs>
            <radialGradient id="evvCore" cx="50%" cy="42%" r="62%">
              <stop offset="0%" stopColor="#eafeff" stopOpacity="0.95" />
              <stop offset="42%" stopColor="#22d3ee" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0b1220" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="evvShield" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7be7ff" />
              <stop offset="55%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#7c5cff" />
            </linearGradient>
          </defs>
          <circle
            cx="200"
            cy="196"
            r="96"
            fill="url(#evvCore)"
            className="ev-vault-coreglow"
          />
          <path
            className="ev-vault-shield"
            d="M200 130 L256 152 L256 206 C256 246 230 268 200 282 C170 268 144 246 144 206 L144 152 Z"
          />
          <circle className="ev-vault-key" cx="200" cy="198" r="13" />
          <path
            className="ev-vault-key"
            d="M193 206 L207 206 L203 232 L197 232 Z"
          />
        </svg>
      </div>

      <style>{`
        .ev-vault-emblem {
          position: relative;
          width: min(100%, 440px);
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          display: grid;
          place-items: center;
          will-change: transform, opacity;
        }
        .ev-vault-layer { position: absolute; inset: 0; }
        .ev-vault-svg { width: 100%; height: 100%; overflow: visible; display: block; }

        .ev-vault-halo {
          position: absolute; inset: 14%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,211,238,0.30), rgba(124,92,255,0.12) 45%, transparent 70%);
          animation: evvBreathe 6s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes evvBreathe {
          0%,100% { transform: scale(0.94); opacity: 0.65; }
          50%     { transform: scale(1.06); opacity: 1; }
        }

        .ev-vault-radar {
          position: absolute; inset: 4%;
          border-radius: 50%;
          background: conic-gradient(from 0deg, rgba(34,211,238,0) 0deg, rgba(34,211,238,0) 290deg, rgba(34,211,238,0.22) 340deg, rgba(125,231,255,0.55) 360deg);
          -webkit-mask-image: radial-gradient(circle, black 0 60%, transparent 61%);
                  mask-image: radial-gradient(circle, black 0 60%, transparent 61%);
          animation: evvSpin 7s linear infinite;
          will-change: transform;
        }

        .ev-vault-outer { animation: evvSpin 80s linear infinite; will-change: transform; }
        .ev-vault-mid   { animation: evvSpinRev 110s linear infinite; will-change: transform; }
        .ev-vault-dial  { animation: evvSpin 46s linear infinite; will-change: transform; }

        .ev-vault-ticks { fill: none; stroke: rgba(125,231,255,0.45); stroke-width: 2; stroke-dasharray: 2 12; }
        .ev-vault-ring-faint { fill: none; stroke: rgba(125,231,255,0.16); stroke-width: 1; }
        .ev-vault-bracket { fill: none; stroke: rgba(125,231,255,0.7); stroke-width: 2.5; stroke-linecap: round; }

        .ev-vault-hex { fill: none; stroke: rgba(34,211,238,0.55); stroke-width: 1.6; stroke-linejoin: round; }
        .ev-vault-hex-inner { fill: rgba(34,211,238,0.03); stroke: rgba(124,92,255,0.35); stroke-width: 1; stroke-linejoin: round; }
        .ev-vault-trace {
          fill: none; stroke: rgba(125,231,255,0.7); stroke-width: 1.6;
          stroke-dasharray: 6 10; animation: evvFlow 5s linear infinite;
          will-change: stroke-dashoffset;
        }
        .ev-vault-vtx { fill: #7be7ff; }

        .ev-vault-dial-ring { fill: none; stroke: rgba(125,231,255,0.25); stroke-width: 1; }
        .ev-vault-dial-ticks { fill: none; stroke: rgba(125,231,255,0.5); stroke-width: 7; stroke-dasharray: 2 18.6; }
        .ev-vault-dial-arc { fill: none; stroke: rgba(34,211,238,0.85); stroke-width: 2.5; stroke-linecap: round; }

        .ev-vault-orbit   { animation: evvSpin 18s linear infinite; will-change: transform; }
        .ev-vault-orbit-2 { animation: evvSpinRev 26s linear infinite; }
        .ev-vault-node {
          position: absolute; left: 50%; top: 50%; width: 12px; height: 12px;
          margin: -6px 0 0 -6px; border-radius: 50%;
          background: radial-gradient(circle, #ffffff 0%, #7be7ff 45%, rgba(34,211,238,0) 72%);
          transform: rotate(var(--a)) translateY(calc(-1 * clamp(150px, 22vw, 205px)));
          will-change: transform;
        }
        .ev-vault-node-sm {
          width: 8px; height: 8px; margin: -4px 0 0 -4px;
          background: radial-gradient(circle, #ffffff 0%, #c4b5fd 45%, rgba(124,92,255,0) 72%);
          transform: rotate(var(--a)) translateY(calc(-1 * clamp(120px, 18vw, 168px)));
        }

        .ev-vault-scan {
          position: absolute; left: 14%; right: 14%; top: 50%; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(125,231,255,0.8), transparent);
          animation: evvScan 5s ease-in-out infinite;
          will-change: transform; opacity: 0;
        }

        .ev-vault-core { display: grid; place-items: center; animation: evvPulse 4.5s ease-in-out infinite; will-change: transform; }
        .ev-vault-coreglow { opacity: 0.9; }
        .ev-vault-shield { fill: rgba(8,16,28,0.55); stroke: url(#evvShield); stroke-width: 2.6; stroke-linejoin: round; }
        .ev-vault-key { fill: #eafeff; }

        @keyframes evvSpin    { to { transform: rotate(360deg); } }
        @keyframes evvSpinRev { to { transform: rotate(-360deg); } }
        @keyframes evvFlow    { to { stroke-dashoffset: -240; } }
        @keyframes evvPulse   { 0%,100% { transform: scale(0.98); } 50% { transform: scale(1.03); } }
        @keyframes evvScan {
          0%,100% { transform: translateY(-120px); opacity: 0; }
          12%,88% { opacity: 0.85; }
          50%     { transform: translateY(120px); }
        }

        @media (max-width: 860px) {
          .ev-vault-mid  { animation-duration: 150s; }
          /* orbit nodes stay visible on mobile; scale radius with viewport so
             they sit on the rings instead of flying past the emblem edge */
          .ev-vault-node {
            transform: rotate(var(--a)) translateY(calc(-1 * clamp(110px, 36vw, 180px)));
          }
          .ev-vault-node-sm {
            transform: rotate(var(--a)) translateY(calc(-1 * clamp(88px, 29vw, 150px)));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ev-vault-halo, .ev-vault-radar, .ev-vault-outer, .ev-vault-mid,
          .ev-vault-dial, .ev-vault-trace, .ev-vault-orbit, .ev-vault-orbit-2,
          .ev-vault-scan, .ev-vault-core { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
