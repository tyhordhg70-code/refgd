"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * CashbackScene — "Get rewarded for shopping online · ahh, the joy of cashback."
 *
 * Pure SVG + CSS @keyframes. Zero framer-motion infinite animations,
 * zero rAF JS during the run loop — every motion runs on the GPU
 * compositor thread, so the scene is buttery on iPhone and never
 * fights Lenis or the framer-motion entrance reveal.
 *
 * Layered story (back → front):
 *   1. Aurora glow halo (slow scale/opacity breath)
 *   2. Three concentric "+CASHBACK" pulse rings emanating from the card
 *   3. Falling cash bills cascading from above
 *   4. Coins arcing toward the wallet on the right
 *   5. Glowing credit card centre-stage (subtle hover-tilt)
 *   6. Wallet / money pouch on the right collecting the coins
 *   7. Sparkle bursts dancing around the card
 *   8. Twin "+%" labels orbiting the card
 *
 * Framer-motion is used ONLY for the one-time entrance reveal of the
 * whole scene (opacity 0 → 1, scale 0.92 → 1, y 20 → 0). After that
 * frame, framer-motion does nothing and CSS keyframes carry every
 * animation forever.
 */
export default function CashbackScene({
  size = 520,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none relative cs-stage ${className}`}
      style={{
        width: `min(${size}px, 92vw)`,
        height: `min(${size}px, 92vw)`,
        ["--cs-size" as any]: `min(${size}px, 92vw)`,
      }}
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* AURORA HALO BACKDROP */}
      <div className={`cs-aurora ${reduced ? "" : "cs-aurora--anim"}`} />

      {/* PULSE RINGS — three rings staggered, each scales 0.6 → 1.4
          and fades out. Communicates "money flowing outward / reward!"  */}
      {!reduced && (
        <>
          <span className="cs-ring" style={{ animationDelay: "0s"   }} />
          <span className="cs-ring" style={{ animationDelay: "1.2s" }} />
          <span className="cs-ring" style={{ animationDelay: "2.4s" }} />
        </>
      )}

      {/* FALLING CASH BILLS — six bills cascading from above with
          slight horizontal sway. Each is a tiny SVG bill with $$ on it. */}
      {!reduced && (
        <div className="cs-rain" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="cs-bill"
              style={{
                left: `${10 + i * 14}%`,
                animationDelay: `${(i * 0.7).toFixed(2)}s`,
                animationDuration: `${4.2 + (i % 3) * 0.6}s`,
                ["--cs-sway" as any]: `${(i % 2 === 0 ? -1 : 1) * (8 + (i % 3) * 4)}px`,
              } as React.CSSProperties}
            >
              <svg viewBox="0 0 60 36" width="48" height="29">
                <defs>
                  <linearGradient id={`cs-bill-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%"   stopColor="#7be0a8" />
                    <stop offset="100%" stopColor="#2a8e58" />
                  </linearGradient>
                </defs>
                <rect x="0.5" y="0.5" width="59" height="35" rx="4"
                  fill={`url(#cs-bill-${i})`} stroke="#0b3a23" strokeWidth="0.6" />
                <circle cx="30" cy="18" r="9" fill="none" stroke="#fff8e6" strokeWidth="0.8" opacity="0.7"/>
                <text x="30" y="22" textAnchor="middle"
                  fontFamily="Clash Display, system-ui" fontWeight="800"
                  fontSize="13" fill="#fff8e6">$</text>
                <text x="6" y="9" fontSize="6" fill="#fff8e6" opacity="0.7">100</text>
                <text x="50" y="32" fontSize="6" fill="#fff8e6" opacity="0.7" textAnchor="end">100</text>
              </svg>
            </span>
          ))}
        </div>
      )}

      {/* CENTRAL CREDIT CARD — slowly tilts and floats. Houses the
          "+CASHBACK" badge that the rings emanate from. */}
      <div className={`cs-card-wrap ${reduced ? "" : "cs-card-wrap--anim"}`}>
        <svg viewBox="0 0 280 180" width="68%" className="cs-card">
          <defs>
            <linearGradient id="cs-card-face" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#1a1530" />
              <stop offset="50%"  stopColor="#2d1f55" />
              <stop offset="100%" stopColor="#0a0817" />
            </linearGradient>
            <linearGradient id="cs-card-edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#ffe28a" stopOpacity="0.95" />
              <stop offset="50%"  stopColor="#f5b945" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b196ff" stopOpacity="0.95" />
            </linearGradient>
            <radialGradient id="cs-card-shine" cx="35%" cy="25%" r="55%">
              <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cs-chip" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#ffe28a" />
              <stop offset="100%" stopColor="#9a6914" />
            </linearGradient>
          </defs>

          {/* Glow halo behind the card */}
          <ellipse cx="140" cy="100" rx="170" ry="110"
            fill="#f5b945" opacity="0.18"
            style={{ filter: "blur(28px)" }} />

          {/* Card body */}
          <rect x="10" y="12" width="260" height="156" rx="18"
            fill="url(#cs-card-face)" />
          {/* Card edge / accent rim */}
          <rect x="10" y="12" width="260" height="156" rx="18"
            fill="none" stroke="url(#cs-card-edge)" strokeWidth="1.6" />
          {/* Glossy highlight */}
          <rect x="10" y="12" width="260" height="156" rx="18"
            fill="url(#cs-card-shine)" />

          {/* EMV chip */}
          <rect x="34" y="58" width="44" height="34" rx="6" fill="url(#cs-chip)" />
          <path d="M34 70 H78 M34 80 H78 M50 58 V92 M62 58 V92"
            stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" fill="none" />

          {/* Contactless icon */}
          <g transform="translate(98, 64)" stroke="#ffe28a" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M0 0 a14 14 0 0 1 0 22" opacity="0.85"/>
            <path d="M6 -4 a20 20 0 0 1 0 30" opacity="0.6"/>
            <path d="M12 -8 a26 26 0 0 1 0 38" opacity="0.4"/>
          </g>

          {/* "+CASHBACK" badge */}
          <g transform="translate(140, 130)">
            <rect x="-72" y="-14" width="144" height="28" rx="14"
              fill="rgba(245,185,69,0.18)" stroke="#ffe28a" strokeWidth="1.2" />
            <text x="0" y="6" textAnchor="middle"
              fontFamily="Clash Display, system-ui" fontWeight="800"
              fontSize="14" fill="#ffe28a" letterSpacing="3">+ CASHBACK</text>
          </g>

          {/* Number band */}
          <text x="34" y="120" fontFamily="ui-monospace, monospace"
            fontWeight="700" fontSize="13" fill="#fff8e6" opacity="0.75"
            letterSpacing="3">**** **** **** 7777</text>

          {/* Holder strip */}
          <text x="240" y="160" textAnchor="end"
            fontFamily="Clash Display, system-ui" fontWeight="700"
            fontSize="11" fill="#fff8e6" opacity="0.7" letterSpacing="2">REFUND GOD</text>
        </svg>
      </div>

      {/* WALLET / MONEY POUCH on the right collecting coins */}
      <div className={`cs-wallet ${reduced ? "" : "cs-wallet--anim"}`}>
        <svg viewBox="0 0 140 110" width="100%">
          <defs>
            <linearGradient id="cs-wallet-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5d2c0a" />
              <stop offset="100%" stopColor="#2a1304" />
            </linearGradient>
            <linearGradient id="cs-wallet-flap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7a3d12" />
              <stop offset="100%" stopColor="#3a1c08" />
            </linearGradient>
          </defs>
          <rect x="6" y="36" width="128" height="68" rx="10" fill="url(#cs-wallet-grad)"
            stroke="#ffe28a" strokeWidth="1.4" />
          <path d="M10 44 H130 V52 H10 Z" fill="rgba(0,0,0,0.35)" />
          {/* Bills sticking out top */}
          <rect x="20" y="14" width="100" height="34" rx="3" fill="#7be0a8" stroke="#0b3a23" strokeWidth="0.8" />
          <text x="70" y="36" textAnchor="middle"
            fontFamily="Clash Display, system-ui" fontWeight="800"
            fontSize="16" fill="#0b3a23">$$$</text>
          {/* Wallet flap */}
          <path d="M6 36 Q70 14 134 36 L134 56 Q70 38 6 56 Z"
            fill="url(#cs-wallet-flap)" stroke="#ffe28a" strokeWidth="1.2" />
          {/* Buckle */}
          <circle cx="70" cy="46" r="4.5" fill="#ffe28a" stroke="#9a6914" strokeWidth="1" />
        </svg>
      </div>

      {/* COINS ARCING INTO THE WALLET — three coins, each on its own
          arc keyframe (cs-arc-1 / 2 / 3). Stagger gives a continuous
          "stream of money flowing in" feel. */}
      {!reduced && (
        <>
          <span className="cs-coin cs-coin--1" style={{ animationDelay: "0s"   }}>
            <CoinSvg sym="$" />
          </span>
          <span className="cs-coin cs-coin--2" style={{ animationDelay: "0.7s" }}>
            <CoinSvg sym="€" />
          </span>
          <span className="cs-coin cs-coin--3" style={{ animationDelay: "1.4s" }}>
            <CoinSvg sym="¥" />
          </span>
        </>
      )}

      {/* SPARKLE BURSTS dancing around the card */}
      {!reduced && (
        <div className="cs-sparkles">
          {Array.from({ length: 10 }).map((_, i) => {
            const angle = (i / 10) * Math.PI * 2;
            const r = 32 + (i % 3) * 6; // % of stage
            return (
              <span
                key={i}
                className="cs-spark"
                style={{
                  left: `${50 + Math.cos(angle) * r}%`,
                  top: `${50 + Math.sin(angle) * r * 0.65}%`,
                  background: i % 2 === 0 ? "#ffe28a" : "#b196ff",
                  boxShadow: `0 0 14px ${i % 2 === 0 ? "#ffe28a" : "#b196ff"}`,
                  animationDelay: `${(i * 0.22).toFixed(2)}s`,
                  animationDuration: `${2.2 + (i % 4) * 0.4}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* FLOATING "+%" CHIP LABELS orbiting the card */}
      {!reduced && (
        <>
          <span className="cs-chip cs-chip--a">+10%</span>
          <span className="cs-chip cs-chip--b">CASHBACK</span>
          <span className="cs-chip cs-chip--c">JOY</span>
        </>
      )}
    </motion.div>
  );
}

function CoinSvg({ sym }: { sym: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <defs>
        <radialGradient id={`cs-coin-${sym}`} cx="38%" cy="32%" r="65%">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="55%" stopColor="#ffd06b" />
          <stop offset="100%" stopColor="#7a4a0d" />
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="20" fill={`url(#cs-coin-${sym})`}
        stroke="#ffe28a" strokeWidth="1.2" />
      <circle cx="22" cy="22" r="16" fill="none"
        stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" strokeDasharray="2 3" />
      <text x="22" y="29" textAnchor="middle"
        fontFamily="Clash Display, system-ui" fontWeight="800"
        fontSize="20" fill="#3a2204">{sym}</text>
    </svg>
  );
}
