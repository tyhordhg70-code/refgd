"use client";
import { useReducedMotion } from "framer-motion";

/**
 * AnimatedTelegramBox v4 — synced to TelegramCard3D fly-in.
 *
 * The card itself now flies in over 1.4 s. This file's tg3-enter
 * is delayed to 0.65 s so the logo appears mid-flight, completing
 * right as the card settles. The ring-expand and glow-pulse are
 * staggered to fire at the landing moment for a satisfying climax.
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
        @keyframes tg3-star {
          0%,100% { opacity: 0.18 }
          50%      { opacity: 0.72 }
        }
        /* Logo entrance — delayed 0.65 s to land as the 3D card settles */
        @keyframes tg3-enter {
          0%   { opacity: 0; transform: scale(0.52) translateY(28px);  }
          62%  { opacity: 1; transform: scale(1.06) translateY(-6px);  }
          100% { opacity: 1; transform: scale(1)    translateY(0px);   }
        }
        @keyframes tg3-float {
          0%,100% { transform: translateY(0px)   rotate(0deg);   }
          42%     { transform: translateY(-13px)  rotate(1.5deg); }
          72%     { transform: translateY(-5px)   rotate(-1deg);  }
        }
        @keyframes tg3-glow-pulse {
          0%,100% { opacity: 0.45; transform: scale(1)    }
          50%     { opacity: 0.82; transform: scale(1.10) }
        }
        @keyframes tg3-ring-expand {
          0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 0.65 }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0    }
        }
      `}</style>

      {/* Depth stars */}
      {Array.from({ length: 22 }).map((_, i) => {
        const left = (i * 43 + 9)  % 100;
        const top  = (i * 67 + 13) % 100;
        const size = 1 + (i % 3) * 0.5;
        const dur  = (3.2 + (i % 5) * 0.9).toFixed(1);
        const del  = ((i % 9) * 0.38).toFixed(1);
        return (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${left}%`, top: `${top}%`,
              width: size, height: size,
              boxShadow: `0 0 ${size * 3}px rgba(255,255,255,0.50)`,
              opacity:   reduced ? 0.35 : undefined,
              animation: reduced ? undefined : `tg3-star ${dur}s ${del}s ease-in-out infinite`,
            }}
          />
        );
      })}

      {/* Rings — delayed to 1.35 s so they bloom exactly as the card lands */}
      {!reduced && (
        <>
          <div style={{
            position: "absolute", left: "50%", top: "44%",
            width: 210, height: 210, borderRadius: "50%",
            border: "1.5px solid rgba(130,100,255,0.50)",
            animation: "tg3-ring-expand 1.1s 1.35s cubic-bezier(0.22,1,0.36,1) forwards",
            transform: "translate(-50%,-50%) scale(0.3)",
            opacity: 0,
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", left: "50%", top: "44%",
            width: 145, height: 145, borderRadius: "50%",
            border: "1px solid rgba(34,211,238,0.40)",
            animation: "tg3-ring-expand 1.1s 1.55s cubic-bezier(0.22,1,0.36,1) forwards",
            transform: "translate(-50%,-50%) scale(0.3)",
            opacity: 0,
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* Glow halo — starts pulsing at 1.65 s (after card settled) */}
      <div
        className="tg-halo"
        style={{
          position: "absolute", left: "50%", top: "44%",
          width: 210, height: 210,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%, rgba(99,77,220,0.68), rgba(34,211,238,0.32) 55%, transparent 80%)",
          filter: "blur(34px)",
          animation: reduced ? undefined : "tg3-glow-pulse 3.8s 1.65s ease-in-out infinite",
          opacity: reduced ? 0.55 : 0.45,
          pointerEvents: "none",
        }}
      />

      {/* Logo — outer: entrance at 0.65 s; inner: float starts at 1.7 s */}
      <div
        style={{
          position: "absolute", left: "50%", top: "44%",
          transform: "translate(-50%,-50%)",
          animation: reduced
            ? undefined
            : "tg3-enter 1.0s 0.65s cubic-bezier(0.16,1,0.3,1) both",
          opacity: reduced ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        <div
          className="tg-logo-glow"
          style={{
            animation: reduced ? undefined : "tg3-float 5.5s 1.7s ease-in-out infinite",
            filter:
              "drop-shadow(0 0 22px rgba(99,77,255,0.62))" +
              " drop-shadow(0 0 50px rgba(34,211,238,0.36))",
          }}
        >
          <svg width="112" height="112" viewBox="0 0 240 240" fill="none">
            <defs>
              <radialGradient id="tg-v4-bg" cx="38%" cy="30%" r="75%">
                <stop offset="0%"   stopColor="#7b5fe0" />
                <stop offset="55%"  stopColor="#5541c8" />
                <stop offset="100%" stopColor="#2a1f88" />
              </radialGradient>
            </defs>
            <circle cx="120" cy="120" r="116"
              fill="url(#tg-v4-bg)"
              stroke="rgba(255,255,255,0.10)" strokeWidth="2"
            />
            <ellipse cx="88" cy="80" rx="40" ry="22"
              fill="rgba(255,255,255,0.15)"
              transform="rotate(-28 88 80)"
            />
            <path d="M 52 128 L 190 68 L 148 172 Z" fill="white" opacity="0.93" />
            <path d="M 52 128 L 102 148 L 148 172 Z" fill="rgba(0,0,0,0.16)" />
            <path d="M 102 148 L 97 178 L 124 156 L 148 172 Z" fill="white" opacity="0.80" />
            <path d="M 52 128 L 190 68 L 148 172 L 102 148 Z" fill="none"
              stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/88 via-ink-950/35 to-transparent pointer-events-none" />
    </div>
  );
}
