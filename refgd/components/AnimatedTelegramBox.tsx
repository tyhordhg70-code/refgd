"use client";
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Animated illustration for the Telegram CTA box.
 *
 * Every animation is a pure CSS @keyframe — transform or opacity only —
 * so the browser compositor handles them without touching the JS thread.
 * Previously 8 framer-motion infinite loops ran JS rAF callbacks every
 * 16 ms, competing with scroll on the main thread. Zero JS rAF now.
 *
 * Two visual variants:
 *   Desktop: 36 twinkling stars, drifting chat bubbles, paper-plane
 *   glyphs, two counter-rotating orbital rings, pulsating planet.
 *   Mobile: scaled-down version of same — ring is static (no rotation).
 */
export default function AnimatedTelegramBox() {
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const STARS    = isMobile ? 6 : 36;
  const BUBBLES  = isMobile ? 0 : 4;
  const PLANES   = isMobile ? 0 : 9;

  return (
    <div
      aria-hidden="true"
      data-testid="animated-telegram-box"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 25% 50%, rgba(167,139,250,0.32), transparent 55%)," +
          "radial-gradient(ellipse at 78% 60%, rgba(34,211,238,0.36), transparent 55%)," +
          "radial-gradient(ellipse at 50% 110%, rgba(245,185,69,0.18), transparent 55%)," +
          "linear-gradient(135deg, #08080f 0%, #1a1228 60%, #08080f 100%)",
      }}
    >
      <style>{`
        /* All keyframes are transform/opacity only — compositor thread */
        @keyframes tg-star    { 0%,100%{opacity:0.22} 50%{opacity:0.92} }
        @keyframes tg-bubble  {
          0%   { transform:translateX(-8%); opacity:0 }
          8%   { opacity:0.85 }
          92%  { opacity:0.85 }
          100% { transform:translateX(1450%); opacity:0 }
        }
        @keyframes tg-plane   {
          0%   { transform:translateY(0%) translateX(0%) rotate(0deg); opacity:0 }
          8%   { opacity:0.95 }
          50%  { transform:translateY(-360%) translateX(9%) rotate(8deg); opacity:0.7 }
          92%  { opacity:0 }
          100% { transform:translateY(-720%) translateX(0%) rotate(-4deg); opacity:0 }
        }
        @keyframes tg-ring-cw  { to { transform:translateY(-50%) rotate(360deg) } }
        @keyframes tg-ring-ccw { to { transform:translateY(-50%) rotate(-360deg) } }
        @keyframes tg-planet   {
          0%,100% { transform:translateY(-50%) scale(1);   opacity:0.85 }
          50%     { transform:translateY(-50%) scale(1.07); opacity:1 }
        }
        @keyframes tg-sweep    {
          0%   { transform:rotate(0deg) }
          100% { transform:rotate(360deg) }
        }
      `}</style>

      {/* ── Stars ── */}
      {Array.from({ length: STARS }).map((_, i) => {
        const left = (i * 37) % 100;
        const top  = (i * 53) % 100;
        const size = 1 + (i % 3);
        const dur  = (3.5 + (i % 5) * 0.9).toFixed(1);
        const del  = ((i % 7) * 0.4).toFixed(1);
        return (
          <span
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${left}%`,
              top:  `${top}%`,
              width:  size,
              height: size,
              boxShadow: `0 0 ${size * 4}px rgba(255,255,255,0.65)`,
              opacity: reduced ? 0.65 : undefined,
              animation: reduced ? undefined : `tg-star ${dur}s ${del}s ease-in-out infinite`,
            }}
          />
        );
      })}

      {/* ── Chat bubbles (desktop) ── */}
      {!reduced && BUBBLES > 0 && Array.from({ length: BUBBLES }).map((_, i) => {
        const top = 22 + i * 30;
        const dur = 12 + i * 2;
        const del = i * 3;
        return (
          <svg
            key={`bub-${i}`}
            width="34" height="28" viewBox="0 0 34 28"
            className="absolute opacity-70"
            style={{
              top: `${top}%`,
              left: "-8%",
              animation: `tg-bubble ${dur}s ${del}s linear infinite`,
            }}
          >
            <path
              d="M3 4 a3 3 0 0 1 3 -3 h22 a3 3 0 0 1 3 3 v12 a3 3 0 0 1 -3 3 h-13 l-7 6 v-6 h-2 a3 3 0 0 1 -3 -3 z"
              fill="rgba(34,211,238,0.18)" stroke="#7be7ff" strokeWidth="1.2"
            />
            <circle cx="13" cy="11" r="1.4" fill="#7be7ff" />
            <circle cx="17" cy="11" r="1.4" fill="#7be7ff" />
            <circle cx="21" cy="11" r="1.4" fill="#7be7ff" />
          </svg>
        );
      })}

      {/* ── Paper planes (desktop) ── */}
      {!reduced && PLANES > 0 && (
        <div className="absolute inset-0">
          {Array.from({ length: PLANES }).map((_, i) => {
            const left = 6 + i * (88 / Math.max(1, PLANES - 1));
            const dur  = (9 + (i % 4) * 2.2).toFixed(1);
            const del  = (i * 1.3).toFixed(1);
            return (
              <svg
                key={`pp-${i}`}
                width="22" height="22" viewBox="0 0 24 24"
                className="absolute"
                style={{
                  left: `${left}%`,
                  bottom: "-14%",
                  filter: "drop-shadow(0 0 5px rgba(123,231,255,0.50))",
                  animation: `tg-plane ${dur}s ${del}s ease-out infinite`,
                }}
              >
                <path d="M22 2 11 13" stroke="#7be7ff" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M22 2 15 22 11 13 2 9z" stroke="#b196ff" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(123,231,255,0.10)" />
              </svg>
            );
          })}
        </div>
      )}

      {/* ── Orbital rings ── desktop = CSS rotate, mobile = static ── */}
      <div
        className="absolute right-[6%] top-[68%] h-[80%] w-[80%] rounded-full border border-white/10 sm:right-[10%] sm:top-1/2 sm:h-[100%] sm:w-[100%]"
        style={{
          aspectRatio: "1/1",
          maxHeight: "560px",
          maxWidth: "560px",
          transformOrigin: "50% 50%",
          transform: "translateY(-50%)",
          animation: (!reduced && !isMobile) ? "tg-ring-cw 60s linear infinite" : undefined,
        }}
      >
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_30px_#67e8f9]" />
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_22px_#a78bfa]" />
        <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_24px_#ffd06b]" />
        <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_22px_#f0abfc]" />
      </div>

      <div
        className="absolute right-[12%] top-[68%] h-[52%] w-[52%] rounded-full border border-white/10 sm:right-[16%] sm:top-1/2 sm:h-[64%] sm:w-[64%]"
        style={{
          aspectRatio: "1/1",
          maxHeight: "360px",
          maxWidth: "360px",
          transformOrigin: "50% 50%",
          transform: "translateY(-50%)",
          animation: (!reduced && !isMobile) ? "tg-ring-ccw 38s linear infinite" : undefined,
        }}
      >
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-[0_0_18px_#ffe28a]" />
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_#7be7ff]" />
      </div>

      {/* ── Planet ── */}
      <div
        className="absolute right-[12%] top-[68%] h-32 w-32 rounded-full sm:right-[16%] sm:top-1/2 sm:h-44 sm:w-44 md:h-56 md:w-56"
        style={{
          background:
            "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(167,139,250,0.62) 40%, rgba(34,211,238,0.40) 75%, transparent 100%)",
          boxShadow:
            "0 0 50px 14px rgba(167,139,250,0.32), inset 0 0 25px rgba(255,255,255,0.4)",
          animation: reduced ? undefined : "tg-planet 5s ease-in-out infinite",
          transform: "translateY(-50%)",
          transformOrigin: "50% 50%",
        }}
      />

      {/* Vertical fade so the headline reads above the planet/ring */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/95 via-ink-950/60 to-transparent" />
    </div>
  );
}
