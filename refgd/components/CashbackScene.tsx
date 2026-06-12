"use client";
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * CashbackScene — "Get rewarded for shopping online."
 *
 * "Cashback Constellation": a premium hero credit card floating in a
 * cosmic reward field — foil edge, guilloché security print, holographic
 * foil patch, specular sweep, orbiting coins, twinkling stars, falling
 * cash, sparkle glints and glass capsules.
 *
 * Pure SVG + CSS @keyframes. Every motion is compositor-only
 * (transform + opacity): no rAF on the JS thread, NO svg filter:blur
 * (radialGradient halos instead) and NO mix-blend-mode — so it stays
 * buttery on iPhone and never fights Lenis or the entrance reveal.
 *
 * Framer-motion is used ONLY for the one-time entrance reveal of the
 * whole scene (opacity 0 → 1, scale 0.92 → 1, y 20 → 0). After that
 * frame, CSS keyframes carry every animation.
 *
 * IMPORTANT: TWO instances mount at once (520px desktop + 260px mobile),
 * so EVERY SVG gradient/pattern id is prefixed with a per-instance
 * `_uid` to avoid cross-instance `url(#id)` collisions.
 */
export default function CashbackScene({
  size = 520,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const _uid = useId().replace(/:/g, "");

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none relative cs-stage ${className}`}
      style={{ width: size, height: size, ["--cs-size" as any]: `${size}px` }}
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* AURORA HALO BACKDROP — layered radialGradients, no filter:blur. */}
      <div className={`cs-aurora ${reduced ? "" : "cs-aurora--anim"}`} />

      {/* TWINKLING STARS */}
      {!reduced &&
        [
          { l: "16%", t: "20%", d: "0s" },
          { l: "78%", t: "16%", d: "0.6s" },
          { l: "86%", t: "62%", d: "1.1s" },
          { l: "24%", t: "74%", d: "1.7s" },
          { l: "62%", t: "84%", d: "0.3s" },
          { l: "8%", t: "50%", d: "2.1s" },
        ].map((s, i) => (
          <span
            key={i}
            className="cs-star"
            style={{ left: s.l, top: s.t, animationDelay: s.d }}
          />
        ))}

      {/* FALLING CASH BILLS — each id is _uid-prefixed. */}
      {!reduced && (
        <div className="cs-rain" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="cs-bill"
              style={
                {
                  left: `${14 + i * 17}%`,
                  animationDelay: `${(i * 0.9).toFixed(2)}s`,
                  animationDuration: `${5 + (i % 3) * 0.8}s`,
                  ["--cs-sway" as any]: `${(i % 2 === 0 ? -1 : 1) * (10 + (i % 3) * 5)}px`,
                } as React.CSSProperties
              }
            >
              <svg viewBox="0 0 60 36" width="46" height="28">
                <defs>
                  <linearGradient id={`${_uid}b${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#9af0c0" />
                    <stop offset="100%" stopColor="#2a8e58" />
                  </linearGradient>
                </defs>
                <rect x="0.5" y="0.5" width="59" height="35" rx="5" fill={`url(#${_uid}b${i})`} stroke="#0b3a23" strokeWidth="0.6" />
                <circle cx="30" cy="18" r="9" fill="none" stroke="#fff8e6" strokeWidth="0.8" opacity="0.65" />
                <text x="30" y="22.5" textAnchor="middle" fontFamily="Clash Display, system-ui" fontWeight="800" fontSize="13" fill="#fff8e6">$</text>
              </svg>
            </span>
          ))}
        </div>
      )}

      {/* HERO CREDIT CARD — float + subtle 3D tilt loop. */}
      <div className={`cs-card-wrap ${reduced ? "" : "cs-card-wrap--anim"}`}>
        <svg viewBox="0 0 300 190" className="cs-card">
          <defs>
            <linearGradient id={`${_uid}face`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2a1f9e" />
              <stop offset="42%" stopColor="#3b28cc" />
              <stop offset="100%" stopColor="#0c0a44" />
            </linearGradient>
            <linearGradient id={`${_uid}edge`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffe28a" />
              <stop offset="45%" stopColor="#f5b945" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#b196ff" />
            </linearGradient>
            <radialGradient id={`${_uid}shine`} cx="32%" cy="22%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${_uid}chip`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffe9a8" />
              <stop offset="50%" stopColor="#e7a93a" />
              <stop offset="100%" stopColor="#9a6914" />
            </linearGradient>
            <radialGradient id={`${_uid}holo`} cx="50%" cy="42%" r="60%">
              <stop offset="0%" stopColor="#bff3d4" />
              <stop offset="45%" stopColor="#b196ff" />
              <stop offset="100%" stopColor="#f5b945" />
            </radialGradient>
            <radialGradient id={`${_uid}halo`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f5b945" stopOpacity="0.4" />
              <stop offset="55%" stopColor="#f5b945" stopOpacity="0.09" />
              <stop offset="100%" stopColor="#f5b945" stopOpacity="0" />
            </radialGradient>
            <pattern id={`${_uid}guil`} width="13" height="13" patternTransform="rotate(34)" patternUnits="userSpaceOnUse">
              <path d="M0 6.5 H13" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
              <path d="M6.5 0 V13" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="1" />
            </pattern>
          </defs>

          {/* under-glow halo (radialGradient — no filter:blur, no hard edge) */}
          <ellipse cx="150" cy="104" rx="205" ry="132" fill={`url(#${_uid}halo)`} />

          {/* body */}
          <rect x="18" y="16" width="264" height="158" rx="22" fill={`url(#${_uid}face)`} />
          {/* guilloché security print */}
          <rect x="18" y="16" width="264" height="158" rx="22" fill={`url(#${_uid}guil)`} />
          {/* glossy highlight */}
          <rect x="18" y="16" width="264" height="158" rx="22" fill={`url(#${_uid}shine)`} />
          {/* foil edge */}
          <rect x="18" y="16" width="264" height="158" rx="22" fill="none" stroke={`url(#${_uid}edge)`} strokeWidth="2" />
          {/* inner hairline */}
          <rect x="24" y="22" width="252" height="146" rx="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          {/* EMV chip */}
          <rect x="40" y="62" width="48" height="38" rx="7" fill={`url(#${_uid}chip)`} stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
          <path d="M40 75 H88 M40 87 H88 M56 62 V100 M72 62 V100" stroke="rgba(0,0,0,0.38)" strokeWidth="0.8" fill="none" />

          {/* contactless waves */}
          <g transform="translate(102, 68)" stroke="#ffe28a" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M0 0 a15 15 0 0 1 0 24" opacity="0.85" />
            <path d="M7 -5 a22 22 0 0 1 0 34" opacity="0.6" />
            <path d="M14 -10 a29 29 0 0 1 0 44" opacity="0.38" />
          </g>

          {/* holographic foil patch */}
          <g transform="translate(230, 44)">
            <rect x="0" y="0" width="38" height="27" rx="6" fill={`url(#${_uid}holo)`} opacity="0.9" />
            <rect x="0" y="0" width="38" height="27" rx="6" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" />
            <path d="M5 24 L17 4 M15 24 L27 4 M25 24 L35 7" stroke="rgba(255,255,255,0.32)" strokeWidth="1" />
          </g>

          {/* number band */}
          <text x="40" y="130" fontFamily="ui-monospace, monospace" fontWeight="700" fontSize="13" fill="#fff8e6" opacity="0.72" letterSpacing="3">**** **** **** 7777</text>

          {/* +CASHBACK pill */}
          <g transform="translate(150, 152)">
            <rect x="-74" y="-13" width="148" height="26" rx="13" fill="rgba(245,185,69,0.16)" stroke="#ffe28a" strokeWidth="1.2" />
            <text x="0" y="5" textAnchor="middle" fontFamily="Clash Display, system-ui" fontWeight="800" fontSize="13" fill="#ffe28a" letterSpacing="3">+ CASHBACK</text>
          </g>

          {/* wordmark */}
          <text x="262" y="166" textAnchor="end" fontFamily="Clash Display, system-ui" fontWeight="700" fontSize="11" fill="#fff8e6" opacity="0.7" letterSpacing="2">REFUND GOD</text>
        </svg>
        {/* specular sweep gliding across the card face */}
        {!reduced && <span className="cs-shimmer" />}
      </div>

      {/* ORBITING COINS — arcs emitted from the card centre. */}
      {!reduced && (
        <>
          <span className="cs-coin cs-coin--1" style={{ animationDelay: "0s" }}>
            <CoinSvg uid={`${_uid}1`} sym="$" tone="gold" />
          </span>
          <span className="cs-coin cs-coin--2" style={{ animationDelay: "0.6s" }}>
            <CoinSvg uid={`${_uid}2`} sym="€" tone="violet" />
          </span>
          <span className="cs-coin cs-coin--3" style={{ animationDelay: "1.2s" }}>
            <CoinSvg uid={`${_uid}3`} sym="¥" tone="green" />
          </span>
        </>
      )}

      {/* SPARKLE GLINTS dancing around the card */}
      {!reduced && (
        <div className="cs-sparkles">
          {Array.from({ length: 7 }).map((_, i) => {
            const angle = (i / 7) * Math.PI * 2;
            const r = 33 + (i % 3) * 6; // % of stage
            return (
              <span
                key={i}
                className="cs-spark"
                style={{
                  left: `${50 + Math.cos(angle) * r}%`,
                  top: `${50 + Math.sin(angle) * r * 0.62}%`,
                  color: i % 2 === 0 ? "#ffe28a" : "#b196ff",
                  animationDelay: `${(i * 0.3).toFixed(2)}s`,
                  animationDuration: `${2.4 + (i % 4) * 0.5}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* GLASS CAPSULES orbiting the card */}
      {!reduced && (
        <>
          <span className="cs-chip cs-chip--a">+10%</span>
          <span className="cs-chip cs-chip--b">Cashback</span>
          <span className="cs-chip cs-chip--c">Joy</span>
        </>
      )}
    </motion.div>
  );
}

function CoinSvg({
  uid,
  sym,
  tone,
}: {
  uid: string;
  sym: string;
  tone: "gold" | "violet" | "green";
}) {
  const ring =
    tone === "violet" ? "#cdb6ff" : tone === "green" ? "#bff3d4" : "#ffe28a";
  const mid =
    tone === "violet" ? "#9a78f0" : tone === "green" ? "#5fcf93" : "#ffd06b";
  const deep =
    tone === "violet" ? "#4a2d9e" : tone === "green" ? "#1f7d3a" : "#7a4a0d";
  return (
    <svg width="46" height="46" viewBox="0 0 46 46">
      <defs>
        <radialGradient id={`${uid}c`} cx="36%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="48%" stopColor={mid} />
          <stop offset="100%" stopColor={deep} />
        </radialGradient>
      </defs>
      <circle cx="23" cy="23" r="21" fill={`url(#${uid}c)`} stroke={ring} strokeWidth="1.4" />
      <circle cx="23" cy="23" r="16.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" strokeDasharray="2 3.5" />
      <text x="23" y="30.5" textAnchor="middle" fontFamily="Clash Display, system-ui" fontWeight="800" fontSize="21" fill="#2a1804">{sym}</text>
    </svg>
  );
}
