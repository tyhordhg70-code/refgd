"use client";
import { useReducedMotion } from "framer-motion";

/**
 * AnimatedTelegramBox v2 — cinematic 3D fly-in.
 *
 * Previous version: twinkling stars, chat bubbles drifting across,
 * paper planes, counter-rotating orbital rings. User feedback: the
 * distorted animation looked glitchy and low-quality.
 *
 * New design: the Telegram paper-plane logo flies into view from
 * deep perspective — a single dramatic entrance followed by a gentle
 * levitation. Speed-lines radiate from the centre on arrival then
 * fade, giving a "warp-jump" cinematic feel. Pure CSS @keyframes
 * (transform + opacity only) so every animation lives on the
 * GPU compositor and never touches the JS thread.
 *
 * Animation timeline:
 *   0 s      → 1.1 s  tg3-flyin: logo travels from z-600 + rotateX/Y
 *                      to final position, easing out like a fighter
 *                      jet killing thrust at the last moment.
 *   0 s      → 0.9 s  tg3-speedlines: 16 radial streaks bloom from
 *                      the centre and fade — hyperspace-exit effect.
 *   0 s      → ∞      tg3-star: background depth stars twinkle softly.
 *   1.1 s    → ∞      tg3-float: logo levitates ±10 px, slow rotateY
 *                      oscillation ±4°. Stagger on glow ring.
 *   0.8 s    → ∞      tg3-glow-pulse: violet-cyan halo behind logo
 *                      breathes slowly.
 */
export default function AnimatedTelegramBox() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      data-testid="animated-telegram-box"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(99,77,180,0.42), transparent 60%)," +
          "radial-gradient(ellipse at 75% 65%, rgba(34,211,238,0.22), transparent 55%)," +
          "linear-gradient(160deg, #07071a 0%, #12102a 50%, #07071a 100%)",
      }}
    >
      <style>{`
        /* ── All keyframes: transform / opacity only (compositor-safe) ── */

        @keyframes tg3-star {
          0%,100% { opacity: 0.18 }
          50%      { opacity: 0.75 }
        }

        @keyframes tg3-speedline {
          0%   { transform: scaleX(0); opacity: 0 }
          18%  { transform: scaleX(1); opacity: 0.60 }
          55%  { transform: scaleX(1); opacity: 0.35 }
          100% { transform: scaleX(1); opacity: 0 }
        }

        @keyframes tg3-flyin {
          0% {
            transform: perspective(900px) translateZ(-700px)
                       rotateX(52deg) rotateY(-38deg) scale(0.12);
            opacity: 0;
          }
          18% { opacity: 1 }
          78% {
            transform: perspective(900px) translateZ(-18px)
                       rotateX(4deg) rotateY(3deg) scale(1.06);
            opacity: 1;
          }
          100% {
            transform: perspective(900px) translateZ(0px)
                       rotateX(0deg) rotateY(0deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes tg3-float {
          0%,100% { transform: translateY(0px)   rotateY(0deg) }
          40%     { transform: translateY(-11px)  rotateY(4deg) }
          70%     { transform: translateY(-6px)   rotateY(-3deg) }
        }

        @keyframes tg3-glow-pulse {
          0%,100% { opacity: 0.50; transform: scale(1)    }
          50%     { opacity: 0.85; transform: scale(1.08) }
        }

        @keyframes tg3-ring-expand {
          0%   { transform: translate(-50%,-50%) scale(0.4); opacity: 0.7 }
          100% { transform: translate(-50%,-50%) scale(1.8); opacity: 0   }
        }
      `}</style>

      {/* ── Depth stars (24) — very subtle, just fill the space ── */}
      {Array.from({ length: 24 }).map((_, i) => {
        const left = (i * 41 + 7) % 100;
        const top  = (i * 63 + 11) % 100;
        const size = 1 + (i % 3) * 0.5;
        const dur  = (3 + (i % 5) * 0.9).toFixed(1);
        const del  = ((i % 9) * 0.35).toFixed(1);
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${left}%`, top: `${top}%`,
              width: size, height: size,
              boxShadow: `0 0 ${size * 3}px rgba(255,255,255,0.55)`,
              opacity: reduced ? 0.4 : undefined,
              animation: reduced ? undefined : `tg3-star ${dur}s ${del}s ease-in-out infinite`,
            }}
          />
        );
      })}

      {/* ── Speed-lines — 16 radial streaks from centre ── */}
      {!reduced && Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * 360;
        const len   = 38 + (i % 3) * 14;
        const del   = (i % 4) * 0.04;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%", top: "42%",
              width: `${len}%`, height: 1.5,
              transformOrigin: "0% 50%",
              transform: `rotate(${angle}deg)`,
            }}
          >
            <div style={{
              width: "100%", height: "100%",
              background: "linear-gradient(90deg, rgba(130,100,255,0.70), rgba(34,211,238,0.45), transparent)",
              animation: `tg3-speedline 0.85s ${del}s cubic-bezier(0.22,1,0.36,1) forwards`,
              transformOrigin: "left center",
            }} />
          </div>
        );
      })}

      {/* ── Expanding ring on arrival ── */}
      {!reduced && (
        <>
          <div style={{
            position: "absolute", left: "50%", top: "42%",
            width: 220, height: 220, borderRadius: "50%",
            border: "1.5px solid rgba(130,100,255,0.55)",
            animation: "tg3-ring-expand 0.95s 0.55s cubic-bezier(0.22,1,0.36,1) forwards",
            transform: "translate(-50%,-50%) scale(0.4)",
            opacity: 0,
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", left: "50%", top: "42%",
            width: 150, height: 150, borderRadius: "50%",
            border: "1px solid rgba(34,211,238,0.45)",
            animation: "tg3-ring-expand 0.95s 0.70s cubic-bezier(0.22,1,0.36,1) forwards",
            transform: "translate(-50%,-50%) scale(0.4)",
            opacity: 0,
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* ── Logo glow halo (behind the logo) ── */}
      <div style={{
        position: "absolute", left: "50%", top: "42%",
        width: 180, height: 180,
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle at 50% 50%, rgba(99,77,220,0.70), rgba(34,211,238,0.35) 55%, transparent 80%)",
        filter: "blur(28px)",
        animation: reduced ? undefined : `tg3-glow-pulse 3.5s 0.8s ease-in-out infinite`,
        opacity: reduced ? 0.6 : 0.5,
      }} />

      {/* ── Telegram logo — 3D fly-in ── */}
      <div style={{
        position: "absolute", left: "50%", top: "42%",
        transform: "translate(-50%,-50%)",
        animation: reduced ? undefined
          : `tg3-flyin 1.1s cubic-bezier(0.16,1,0.3,1) forwards,
             tg3-float 5.5s 1.1s ease-in-out infinite`,
        opacity: reduced ? 1 : 0,
        filter: "drop-shadow(0 0 28px rgba(99,77,255,0.65)) drop-shadow(0 0 60px rgba(34,211,238,0.40))",
      }}>
        <svg width="100" height="100" viewBox="0 0 240 240" fill="none">
          {/* Circular background */}
          <circle cx="120" cy="120" r="116"
            fill="url(#tg-grad)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="2"
          />
          {/* Telegram paper-plane mark */}
          <path
            d="M175 75 L85 115 L80 150 L100 135 L130 155 L175 75Z"
            fill="rgba(255,255,255,0.18)"
          />
          <path
            d="M175 75 L65 112 L80 150 L100 135"
            stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M80 150 L100 135 L130 155 Z"
            fill="white" opacity="0.95"
          />
          <path
            d="M100 135 L175 75"
            stroke="white" strokeWidth="4.5" strokeLinecap="round"
            fill="none"
          />
          <path
            d="M65 112 L175 75 L130 155 L80 150 Z"
            fill="white" opacity="0.90"
          />
          {/* Shine highlight */}
          <ellipse cx="95" cy="95" rx="28" ry="16" fill="rgba(255,255,255,0.22)"
            transform="rotate(-30 95 95)"
          />
          <defs>
            <radialGradient id="tg-grad" cx="38%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#7b5fe0" />
              <stop offset="55%" stopColor="#5b3fc0" />
              <stop offset="100%" stopColor="#2a1f7a" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Vertical fade so text above reads cleanly */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/90 via-ink-950/40 to-transparent pointer-events-none" />
    </div>
  );
}
