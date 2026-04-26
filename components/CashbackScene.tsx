"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Animated 3D-feel "cashback" scene. Replaces the static planet/orb
 * on the /store-list hero. Features:
 *   - Floating orbital ring of currency coins ($, €, £, ¥) that rotate
 *     in 3D space and catch the light.
 *   - A central shopping bag with a glowing receipt curl spilling out.
 *   - Sparkling joy bursts (gold + violet) that pulse outward.
 *   - All pure SVG + framer-motion — no static raster, no orb planet.
 */
export default function CashbackScene({
  size = 520,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  // Coin definitions — symbol, hue, orbit radius, period, phase offset
  const coins = [
    { sym: "$", color: "#ffd06b", r: 200, dur: 18, phase: 0,    z: 24 },
    { sym: "€", color: "#b196ff", r: 220, dur: 22, phase: 90,   z: 12 },
    { sym: "£", color: "#7be7ff", r: 180, dur: 14, phase: 180,  z: 36 },
    { sym: "¥", color: "#ff8aa1", r: 240, dur: 26, phase: 270,  z: 0  },
  ];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative ${className}`}
      style={{ width: size, height: size, perspective: "1400px" }}
    >
      {/* AMBIENT GLOW HALO */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,225,140,0.28), rgba(167,139,250,0.18) 40%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />

      {/* ROTATING ORBIT TRACKS */}
      <motion.div
        className="absolute inset-0"
        animate={reduced ? {} : { rotateZ: 360 }}
        transition={reduced ? {} : { duration: 60, repeat: Infinity, ease: "linear" }}
        style={{ transformStyle: "preserve-3d", transform: "rotateX(60deg)" }}
      >
        {[180, 220, 260].map((r, i) => (
          <span
            key={r}
            className="absolute rounded-full border"
            style={{
              left: "50%",
              top: "50%",
              width: r,
              height: r,
              transform: `translate(-50%,-50%)`,
              borderColor: ["rgba(255,225,140,0.30)", "rgba(167,139,250,0.25)", "rgba(34,211,238,0.20)"][i],
            }}
          />
        ))}
      </motion.div>

      {/* CENTRAL SHOPPING BAG (3D look via stacked SVG layers) */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={reduced ? {} : { y: [-6, 6, -6], rotate: [-2, 2, -2] }}
        transition={reduced ? {} : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg width="180" height="200" viewBox="0 0 180 200">
          <defs>
            <linearGradient id="cs-bag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffe28a" />
              <stop offset="55%" stopColor="#f5b945" />
              <stop offset="100%" stopColor="#a26815" />
            </linearGradient>
            <linearGradient id="cs-shadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
            </linearGradient>
            <radialGradient id="cs-glow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="60%" stopColor="rgba(255,225,140,0.0)" />
            </radialGradient>
          </defs>

          {/* Handle */}
          <path
            d="M55 65 Q55 25, 90 25 Q125 25, 125 65"
            stroke="#ffd06b"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />

          {/* Bag body — 3D feel via two layers */}
          <path d="M30 60 H150 L142 195 H38 Z" fill="url(#cs-bag)" />
          <path d="M30 60 H150 L142 195 H38 Z" fill="url(#cs-shadow)" opacity="0.55" />
          <path d="M30 60 H150 L142 195 H38 Z" fill="url(#cs-glow)" />

          {/* Highlights / seam */}
          <path d="M44 60 L40 195" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
          <path d="M138 60 L140 195" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />

          {/* "%" stamp */}
          <text
            x="90"
            y="140"
            textAnchor="middle"
            fontFamily="Clash Display, system-ui"
            fontWeight="800"
            fontSize="56"
            fill="#3a2204"
            opacity="0.85"
          >
            %
          </text>

          {/* Receipt curl peeking out */}
          <path
            d="M70 60 L72 30 Q72 18, 84 18 L96 18 Q108 18, 108 30 L110 60 Z"
            fill="#fff8e6"
            stroke="#a26815"
            strokeWidth="1.2"
          />
          <line x1="78" y1="30" x2="102" y2="30" stroke="#a26815" strokeWidth="1" />
          <line x1="78" y1="38" x2="102" y2="38" stroke="#a26815" strokeWidth="1" />
          <line x1="78" y1="46" x2="92" y2="46" stroke="#a26815" strokeWidth="1" />
        </svg>
      </motion.div>

      {/* ORBITING COINS — each is its own animated wrapper */}
      {coins.map((coin) => (
        <motion.span
          key={coin.sym}
          className="absolute left-1/2 top-1/2 block h-0 w-0"
          style={{
            transform: `translate(-50%,-50%) rotate(${coin.phase}deg)`,
            transformStyle: "preserve-3d",
          }}
          animate={reduced ? {} : { rotate: [coin.phase, coin.phase + 360] }}
          transition={reduced ? {} : { duration: coin.dur, repeat: Infinity, ease: "linear" }}
        >
          <span
            className="absolute"
            style={{
              transform: `translate(-50%,-50%) translateY(-${coin.r / 2}px) translateZ(${coin.z}px)`,
              filter: `drop-shadow(0 6px 14px ${coin.color})`,
            }}
          >
            <svg width="58" height="58" viewBox="0 0 58 58">
              <defs>
                <radialGradient id={`coin-${coin.sym}`} cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor={coin.color} />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
                </radialGradient>
              </defs>
              <circle cx="29" cy="29" r="26" fill={`url(#coin-${coin.sym})`} stroke={coin.color} strokeWidth="1.5" />
              <circle cx="29" cy="29" r="22" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" strokeDasharray="2 3" />
              <text
                x="29"
                y="38"
                textAnchor="middle"
                fontFamily="Clash Display, system-ui"
                fontWeight="800"
                fontSize="26"
                fill="#3a2204"
              >
                {coin.sym}
              </text>
            </svg>
          </span>
        </motion.span>
      ))}

      {/* SPARKLING JOY BURSTS — pulse outward */}
      {!reduced &&
        Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const baseR = 130;
          const x = Math.cos(angle) * baseR;
          const y = Math.sin(angle) * baseR;
          const dur = 2.4 + (i % 3) * 0.6;
          const delay = (i * 0.18).toFixed(2);
          return (
            <motion.span
              key={`spark-${i}`}
              className="absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full"
              style={{
                background: i % 2 === 0 ? "#ffe28a" : "#b196ff",
                boxShadow: `0 0 12px ${i % 2 === 0 ? "#ffe28a" : "#b196ff"}`,
              }}
              animate={{
                x: [0, x],
                y: [0, y],
                opacity: [0, 1, 0],
                scale: [0.4, 1, 0.5],
              }}
              transition={{ duration: dur, repeat: Infinity, delay: parseFloat(delay), ease: "easeOut" }}
            />
          );
        })}

      {/* TINY FLOATING LABEL CHIPS */}
      {!reduced &&
        ["+10%", "FREE", "REFUND", "+$$$", "VIP"].map((txt, i) => {
          const x = -180 + i * 90;
          const baseDelay = i * 0.6;
          return (
            <motion.span
              key={txt}
              className="absolute left-1/2 top-1/2 rounded-full border border-amber-300/40 bg-ink-950/60 px-2.5 py-0.5 font-semibold text-[10px] uppercase tracking-[0.2em] text-amber-100 backdrop-blur-sm"
              style={{ x, y: 180, textShadow: "0 0 10px rgba(255,225,140,0.6)" }}
              animate={{ y: [180, -200], opacity: [0, 0.95, 0] }}
              transition={{ duration: 6, delay: baseDelay, repeat: Infinity, ease: "easeOut" }}
            >
              {txt}
            </motion.span>
          );
        })}
    </div>
  );
}
