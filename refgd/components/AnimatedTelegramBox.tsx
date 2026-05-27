"use client";
import { useReducedMotion } from "framer-motion";

/**
 * AnimatedTelegramBox v3 — clean entrance, no distortion, no flicker.
 *
 * v2 problems fixed:
 *   1. Distorted animation — the `tg3-flyin` keyframe started at
 *      rotateX(52deg) rotateY(-38deg) which caused severe 3D perspective
 *      warping throughout the entrance. Replaced with a pure scale +
 *      translateY entrance: visually cinematic with zero distortion.
 *
 *   2. Flickering — v2 ran `tg3-flyin forwards` AND `tg3-float infinite`
 *      on the SAME element. Both drove `transform`; at t=1.1 s the fill
 *      context switched from `perspective(900px) rotateX(0)` to plain
 *      `translateY(0)` — that discontinuity was the flicker. Fixed by
 *      using TWO nested wrappers:
 *        • outer  → entrance animation only (fires once)
 *        • inner  → perpetual float (never touches the outer transform)
 *      The transforms now compose via DOM nesting, not CSS override.
 *
 *   3. Cramped icon — all plane paths lived in x:65–175, y:70–155 of a
 *      240×240 viewBox, producing overlapping, letter-like shapes. Replaced
 *      with a clean 4-shape plane: body fills x:50–190, y:68–176, each
 *      shape is clearly distinct and well spaced.
 *
 * Animation timeline:
 *   0 s    → 1.0 s  tg3-enter : scale 0.52 → 1.05 → 1, opacity 0 → 1
 *   1.0 s  → ∞      tg3-float : gentle ±13 px translateY, ±1.5° rotate
 *   1.0 s  → ∞      tg3-glow-pulse : halo breathes (on a separate div)
 *   0 s    → ∞      tg3-star  : background depth stars twinkle softly
 *   0.6 s  (once)   tg3-ring-expand : two rings bloom on arrival
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
        /* All keyframes: transform / opacity only — compositor-safe */

        @keyframes tg3-star {
          0%,100% { opacity: 0.18 }
          50%      { opacity: 0.72 }
        }

        /* Entrance: scale + translateY only — NO rotateX/Y distortion */
        @keyframes tg3-enter {
          0%   { opacity: 0; transform: scale(0.52) translateY(28px);  }
          62%  { opacity: 1; transform: scale(1.06) translateY(-6px);  }
          100% { opacity: 1; transform: scale(1)    translateY(0px);   }
        }

        /* Float: lives on the INNER wrapper so it never races tg3-enter */
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

      {/* ── Depth stars (22) ── */}
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

      {/* ── Rings that bloom on arrival (play once, then gone) ── */}
      {!reduced && (
        <>
          <div style={{
            position: "absolute", left: "50%", top: "44%",
            width: 210, height: 210, borderRadius: "50%",
            border: "1.5px solid rgba(130,100,255,0.50)",
            animation: "tg3-ring-expand 1.1s 0.55s cubic-bezier(0.22,1,0.36,1) forwards",
            transform: "translate(-50%,-50%) scale(0.3)",
            opacity: 0,
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", left: "50%", top: "44%",
            width: 145, height: 145, borderRadius: "50%",
            border: "1px solid rgba(34,211,238,0.40)",
            animation: "tg3-ring-expand 1.1s 0.72s cubic-bezier(0.22,1,0.36,1) forwards",
            transform: "translate(-50%,-50%) scale(0.3)",
            opacity: 0,
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* ── Glow halo (lives on its own element — never fights the logo) ── */}
      <div
        style={{
          position: "absolute", left: "50%", top: "44%",
          width: 210, height: 210,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%, rgba(99,77,220,0.68), rgba(34,211,238,0.32) 55%, transparent 80%)",
          filter: "blur(34px)",
          animation: reduced ? undefined : "tg3-glow-pulse 3.8s 1.0s ease-in-out infinite",
          opacity: reduced ? 0.55 : 0.45,
          pointerEvents: "none",
        }}
      />

      {/* ── Logo — TWO nested wrappers so entrance + float never compete ──
          Outer: entrance (tg3-enter, fires once, holds final state via `both`)
          Inner: float   (tg3-float, looping, starts after entrance) */}
      <div
        style={{
          position: "absolute", left: "50%", top: "44%",
          transform: "translate(-50%,-50%)",
          /* `both` = fill backwards (opacity:0 before start) + forwards (hold end) */
          animation: reduced ? undefined : "tg3-enter 1.0s cubic-bezier(0.16,1,0.3,1) both",
          opacity: reduced ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            animation: reduced ? undefined : "tg3-float 5.5s 1.05s ease-in-out infinite",
            filter:
              "drop-shadow(0 0 22px rgba(99,77,255,0.62))" +
              " drop-shadow(0 0 50px rgba(34,211,238,0.36))",
          }}
        >
          <svg width="112" height="112" viewBox="0 0 240 240" fill="none">
            <defs>
              <radialGradient id="tg-v3-bg" cx="38%" cy="30%" r="75%">
                <stop offset="0%"   stopColor="#7b5fe0" />
                <stop offset="55%"  stopColor="#5541c8" />
                <stop offset="100%" stopColor="#2a1f88" />
              </radialGradient>
            </defs>

            {/* Circle background */}
            <circle cx="120" cy="120" r="116"
              fill="url(#tg-v3-bg)"
              stroke="rgba(255,255,255,0.10)" strokeWidth="2"
            />
            {/* Gloss highlight — top-left quadrant only */}
            <ellipse cx="88" cy="80" rx="40" ry="22"
              fill="rgba(255,255,255,0.15)"
              transform="rotate(-28 88 80)"
            />

            {/*
              Clean Telegram paper-plane — 4 well-spaced shapes:
                1. Main body   — large filled triangle (the plane wing)
                2. Under-fold  — subtle darker triangle for paper depth
                3. Folded tail — the characteristic flap at the back
                4. Body stroke — crisp outline for clean edge definition

              All coordinates use the full 240×240 space generously:
                x range: 50 → 190  (covers 140 px of 240)
                y range: 68 → 176  (covers 108 px of 240)
              No cramped clusters — each shape is visually distinct.
            */}

            {/* 1. Main plane body */}
            <path
              d="M 52 128 L 190 68 L 148 172 Z"
              fill="white"
              opacity="0.93"
            />

            {/* 2. Under-fold shadow — splits body into lit / shadow halves */}
            <path
              d="M 52 128 L 102 148 L 148 172 Z"
              fill="rgba(0,0,0,0.16)"
            />

            {/* 3. Folded tail flap — the bent-back lower edge */}
            <path
              d="M 102 148 L 97 178 L 124 156 L 148 172 Z"
              fill="white"
              opacity="0.80"
            />

            {/* 4. Body outline for crispness */}
            <path
              d="M 52 128 L 190 68 L 148 172 L 102 148 Z"
              fill="none"
              stroke="rgba(255,255,255,0.30)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Vertical fade so the headline text above reads cleanly */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/88 via-ink-950/35 to-transparent pointer-events-none" />
    </div>
  );
}
