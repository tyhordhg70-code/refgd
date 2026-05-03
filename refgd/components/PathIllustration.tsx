"use client";
import { motion, MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";

export type PathIllustrationKind =
  | "store"
  | "shield"
  | "chess"
  | "spark"
  | "mastery"
  | "buy4you";

const ACCENT_TO_HEX: Record<string, { primary: string; secondary: string; soft: string }> = {
  gold:    { primary: "#f5b945", secondary: "#ffe28a", soft: "rgba(245,185,69,0.30)" },
  fuchsia: { primary: "#ec4899", secondary: "#f9a8d4", soft: "rgba(236,72,153,0.30)" },
  cyan:    { primary: "#22d3ee", secondary: "#a5f3fc", soft: "rgba(34,211,238,0.30)" },
  violet:  { primary: "#8b5cf6", secondary: "#c4b5fd", soft: "rgba(139,92,246,0.30)" },
  orange:  { primary: "#f97316", secondary: "#fdba74", soft: "rgba(249,115,22,0.30)" },
};

/**
 * Vector illustration set for the home path-cards. Each kind tells a
 * small story and now ANIMATES continuously — every illustration breathes:
 *   - store:   storefront with pulsing "SALE" tag + flickering windows
 *   - shield:  hexagonal shield with arrows that fly in & deflect
 *   - spark:   diamond with rotating burst rays
 *   - mastery: NEW — floating crown over levitating gem with orbiting stars
 *              (replaces the chess scene per the design brief)
 *   - chess:   kept for backwards-compat in case other pages reference it
 *
 * Designs / colors are PRESERVED — only motion was added.
 */
function PathIllustrationContent({
  kind,
  accent,
  noFilter = false,
}: {
  kind: PathIllustrationKind;
  accent: keyof typeof ACCENT_TO_HEX;
  noFilter?: boolean;
  /**
   * v6.12.1 — when true, ALL `filter="url(#pi-glow-…)"` references
   * inside this SVG are dropped. iOS Safari has a long-standing
   * WebKit bug (rdar://15553285 / WebKit bug #95820) where an SVG
   * <filter> element fails to evaluate when the SVG sits under a
   * `transform: rotateY(...)` 3D-transformed parent: the filtered
   * element becomes invisible (and on some builds the entire SVG
   * stops painting). The mobile path-card carousel had this exact
   * setup (SVG inside a 3D-rotated AnimatePresence wrapper), which
   * caused the user's repeated "illustrations missing" report.
   * The mobile call-site passes noFilter so the artwork still
   * renders cleanly without the soft glow halo.
   */
}) {
  const c = ACCENT_TO_HEX[accent];
  const glowFilter = noFilter ? undefined : `url(#pi-glow-${kind})`;

  return (
    <motion.svg
      viewBox="0 0 400 500"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      // v6.7 — initial={false} so the SVG renders at its final
      // {opacity:1, scale:1} state immediately. Previously the
      // {opacity:0} initial combined with the parent MotionConfig
      // reducedMotion="always" wrapper (used to freeze inactive
      // Swiper-cube slides) left the SVG STUCK at opacity:0 — the
      // user reported this as "blank illustrations on path cards".
      // initial={false} skips the initial state entirely and
      // guarantees the artwork is visible regardless of reduced
      // motion / freeze state.
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0 }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`pi-bg-${kind}`} cx="50%" cy="35%" r="80%">
          <stop offset="0%" stopColor={c.secondary} stopOpacity="0.55" />
          <stop offset="55%" stopColor={c.primary} stopOpacity="0.18" />
          <stop offset="100%" stopColor="#05060a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`pi-stroke-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.secondary} stopOpacity="0.95" />
          <stop offset="100%" stopColor={c.primary} stopOpacity="0.7" />
        </linearGradient>
        <filter id={`pi-glow-${kind}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background atmospheric wash, breathing */}
      <motion.rect
        x="0" y="0" width="400" height="500"
        fill={`url(#pi-bg-${kind})`}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle dotted grid overlay */}
      <g opacity="0.18">
        {Array.from({ length: 20 }).map((_, r) =>
          Array.from({ length: 16 }).map((_, col) => (
            <circle key={`${r}-${col}`} cx={col * 26 + 12} cy={r * 26 + 12} r="0.8" fill="white" />
          ))
        )}
      </g>

      {kind === "store"   && <StoreScene   c={c} kind={kind} glowFilter={glowFilter} />}
      {kind === "shield"  && <ShieldScene  c={c} kind={kind} glowFilter={glowFilter} />}
      {kind === "chess"   && <ChessScene   c={c} kind={kind} glowFilter={glowFilter} />}
      {kind === "spark"   && <SparkScene   c={c} kind={kind} glowFilter={glowFilter} />}
      {kind === "mastery" && <MasteryScene c={c} kind={kind} glowFilter={glowFilter} />}
      {kind === "buy4you" && <Buy4YouScene c={c} kind={kind} glowFilter={glowFilter} />}

      {/* Floating accent dots (always present). We animate the wrapping
          <motion.g> via CSS transforms (y) instead of the SVG `cy`
          attribute — framer-motion can briefly emit `undefined` for raw
          SVG attributes during the first frame, producing console
          errors like "<circle> attribute cy: Expected length, 'undefined'". */}
      <g>
        {[
          { x: 60,  y: 80,  r: 2.5 },
          { x: 320, y: 110, r: 1.8 },
          { x: 95,  y: 380, r: 2.2 },
          { x: 350, y: 320, r: 2.0 },
          { x: 200, y: 60,  r: 1.4 },
          { x: 280, y: 460, r: 1.6 },
        ].map((p, i) => (
          <motion.g
            key={i}
            initial={{ y: 0, opacity: 0.4 }}
            animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={c.secondary}
              filter={glowFilter}
            />
          </motion.g>
        ))}
      </g>
    </motion.svg>
  );
}

/* ─────────────────────────── STORE ─────────────────────────── */
function StoreScene({ c, kind, glowFilter }: { c: any; kind: string; glowFilter?: string }) {
  return (
    <motion.g
      filter={glowFilter}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Spotlight cone — pulses */}
      <motion.polygon
        points="200,40 130,260 270,260"
        fill={c.secondary}
        animate={{ opacity: [0.06, 0.18, 0.06] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Storefront grid */}
      <g transform="translate(80,180)" stroke={`url(#pi-stroke-${kind})`} strokeWidth="2" fill="none">
        <path d="M0,0 L240,0 L260,40 L-20,40 Z" fill={c.soft} />
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={i * (240 / 6)} y1="0" x2={i * (240 / 6) + 20} y2="40" />
        ))}
        <rect x="-20" y="40" width="280" height="180" rx="6" fill="rgba(5,6,10,0.28)" />
        <rect x="100" y="120" width="40" height="100" rx="4" fill={c.soft} />
        <circle cx="134" cy="170" r="2" fill={c.secondary} />
        {/* Windows — flicker (alternating) */}
        <motion.rect x="10"  y="80"  width="60" height="30" rx="3" fill={c.soft}
          animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.4, repeat: Infinity }} />
        <motion.rect x="170" y="80"  width="60" height="30" rx="3" fill={c.soft}
          animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2.4, repeat: Infinity }} />
        <rect x="10"  y="135" width="60" height="60" rx="3" fill="rgba(5,6,10,0.45)" />
        <rect x="170" y="135" width="60" height="60" rx="3" fill="rgba(5,6,10,0.45)" />
        {/* SALE tag — bobs */}
        <g transform="translate(180,55)">
          <motion.g
            animate={{ rotate: [-4, 6, -4], y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "0px 10px" }}
          >
            <polygon points="0,0 26,0 36,10 26,20 0,20" fill={c.primary} />
            <circle cx="6" cy="10" r="1.8" fill="#05060a" />
          </motion.g>
        </g>
      </g>
      <text x="200" y="160" textAnchor="middle"
            fontFamily="Clash Display, system-ui" fontWeight="700"
            fontSize="20" fill={c.secondary} letterSpacing="3">STORE</text>
    </motion.g>
  );
}

/* ─────────────────────────── SHIELD ────────────────────────── */
function ShieldScene({ c, kind, glowFilter }: { c: any; kind: string; glowFilter?: string }) {
  return (
    <g filter={glowFilter}>
      {/* Shield body — gentle breathing */}
      <g transform="translate(200,260)">
      <motion.g
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "0px 0px" }}
      >
        <path
          d="M0,-110 L95,-72 L82,40 C80,90 40,128 0,140 C-40,128 -80,90 -82,40 L-95,-72 Z"
          fill={c.soft}
          stroke={`url(#pi-stroke-${kind})`}
          strokeWidth="3"
        />
        <path d="M-32,-2 L-8,22 L34,-30" stroke={c.secondary} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
      </g>
      {/* Arrows fly in then deflect away */}
      {[
        { x: 80,  y: 110, rot: 25 },
        { x: 320, y: 140, rot: -30 },
        { x: 100, y: 360, rot: 45 },
        { x: 310, y: 380, rot: -55 },
      ].map((a, i) => (
        <g key={i} transform={`translate(${a.x},${a.y}) rotate(${a.rot})`}>
          <motion.g
            animate={{ x: [-30, 0, -30], opacity: [0, 1, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          >
            <line x1="0" y1="0" x2="46" y2="0" stroke={c.secondary} strokeWidth="2" opacity="0.7" />
            <polygon points="46,-5 56,0 46,5" fill={c.secondary} opacity="0.7" />
          </motion.g>
        </g>
      ))}
      {/* Tiny lock at top — pulses */}
      <motion.g
        transform="translate(192,140)"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="0" y="6" width="16" height="14" rx="2" fill={c.primary} />
        <path d="M3,6 V2 a5,5 0 0 1 10,0 V6" stroke={c.secondary} strokeWidth="2" fill="none" />
      </motion.g>
    </g>
  );
}

/* ─────────────────────────── CHESS ─────────────────────────── */
function ChessScene({ c, kind, glowFilter }: { c: any; kind: string; glowFilter?: string }) {
  return (
    <g filter={glowFilter}>
      <g transform="translate(200,330)">
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 4 }).map((_, col) => {
            const x = (col - r) * 36;
            const y = (col + r) * 18;
            return (
              <polygon
                key={`${r}-${col}`}
                points={`${x},${y} ${x + 36},${y + 18} ${x},${y + 36} ${x - 36},${y + 18}`}
                fill={(r + col) % 2 === 0 ? c.soft : "rgba(5,6,10,0.5)"}
                stroke={c.primary}
                strokeWidth="0.6"
                opacity="0.85"
              />
            );
          })
        )}
      </g>
      <g transform="translate(170,150)">
      <motion.g
        fill={c.secondary} stroke={c.primary} strokeWidth="2"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M30,0 L30,18 M22,9 L38,9" strokeLinecap="round" strokeWidth="3" />
        <path d="M14,30 Q30,18 46,30 L52,80 L8,80 Z" />
        <ellipse cx="30" cy="30" rx="20" ry="7" />
        <rect x="6" y="80" width="48" height="14" rx="3" />
      </motion.g>
      </g>
      <g transform="translate(240,200)">
      <motion.g
        fill={c.primary} opacity="0.9"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <path d="M0,80 L0,52 Q0,28 18,18 Q24,8 36,8 Q48,8 50,22 Q60,30 56,52 L56,80 Z" stroke={c.secondary} strokeWidth="2" />
        <circle cx="22" cy="28" r="2.5" fill="#05060a" />
      </motion.g>
      </g>
    </g>
  );
}

/* ─────────────────────────── SPARK ─────────────────────────── */
function SparkScene({ c, kind, glowFilter }: { c: any; kind: string; glowFilter?: string }) {
  return (
    <g filter={glowFilter}>
      {/* Diamond — slow breathe */}
      <g transform="translate(200,250)">
        <motion.g
          stroke={c.secondary} strokeWidth="3" fill={c.soft}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "0px 0px" }}
        >
          <polygon points="0,-90 80,0 0,90 -80,0" />
          <polygon points="0,-90 30,-30 -30,-30" fill={c.primary} opacity="0.55" />
          <polygon points="0,90 30,30 -30,30" fill={c.primary} opacity="0.45" />
          <line x1="-80" y1="0" x2="80" y2="0" />
          <line x1="-30" y1="-30" x2="30" y2="-30" />
          <line x1="-30" y1="30" x2="30" y2="30" />
        </motion.g>
      </g>
      {/* Bursting rays — rotate slowly around center */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "200px 250px", transformBox: "fill-box" }}
      >
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = i * 45;
          const r1 = 130, r2 = 170;
          // Round floats so SSR/CSR strings match exactly (avoids
          // React hydration warnings on trig-derived attributes).
          const round = (n: number) => Number(n.toFixed(3));
          const x1 = round(200 + Math.cos((angle * Math.PI) / 180) * r1);
          const y1 = round(250 + Math.sin((angle * Math.PI) / 180) * r1);
          const x2 = round(200 + Math.cos((angle * Math.PI) / 180) * r2);
          const y2 = round(250 + Math.sin((angle * Math.PI) / 180) * r2);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={c.secondary} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          );
        })}
      </motion.g>
      {/* Star sparkles — twinkle */}
      {[
        { x: 80,  y: 130 },
        { x: 320, y: 150 },
        { x: 110, y: 380 },
        { x: 300, y: 360 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`}>
          <motion.g
            animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
            style={{ transformOrigin: "0px 0px" }}
          >
            <path d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" fill={c.secondary} />
          </motion.g>
        </g>
      ))}
    </g>
  );
}

/* ─────────────────────────── BUY 4 YOU ─────────────────────── */
/** "BUY 4 YOU" / concierge ordering illustration — a giant 4 with a
 *  glowing shopping bag passing through it and orbiting "for-you" tags. */
function Buy4YouScene({ c, kind, glowFilter }: { c: any; kind: string; glowFilter?: string }) {
  return (
    <g filter={glowFilter}>
      {/* Background "4" */}
      <motion.text
        x="200" y="320"
        textAnchor="middle"
        fontFamily="Clash Display, system-ui"
        fontWeight="800"
        fontSize="320"
        fill={c.soft}
        stroke={c.secondary}
        strokeWidth="3"
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        4
      </motion.text>

      {/* Shopping bag — bobs */}
      <g transform="translate(200,250)">
      <motion.g
        animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "0px 0px" }}
      >
        {/* Handle */}
        <path
          d="M-22,-30 Q-22,-58 0,-58 Q22,-58 22,-30"
          stroke={c.secondary}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Bag body */}
        <path
          d="M-46,-30 L46,-30 L40,60 L-40,60 Z"
          fill={c.primary}
          stroke={c.secondary}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Sparkle on the bag */}
        <motion.path
          d="M-12,0 L-9,-7 L-2,-10 L-9,-13 L-12,-20 L-15,-13 L-22,-10 L-15,-7 Z"
          fill="#fff8e6"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "-12px -10px", transformBox: "fill-box" }}
        />
        {/* Heart */}
        <path
          d="M14,8 a6,6 0 0 1 12,0 a6,6 0 0 1 12,0 c0,8 -12,16 -12,16 c0,0 -12,-8 -12,-16 z"
          transform="translate(-20,8)"
          fill="#fff8e6"
          opacity="0.9"
        />
      </motion.g>
      </g>

      {/* Orbiting "FOR YOU" / coin tags */}
      {[
        { a: 0,   r: 130, label: "FOR YOU" },
        { a: 120, r: 130, label: "GIFT" },
        { a: 240, r: 130, label: "DEAL" },
      ].map((t, i) => (
        <motion.g
          key={i}
          animate={{ rotate: 360 }}
          transition={{ duration: 22 + i * 3, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "200px 250px", transformBox: "fill-box" }}
        >
          <g
            transform={`translate(${(200 + Math.cos((t.a * Math.PI) / 180) * t.r).toFixed(3)}, ${(250 + Math.sin((t.a * Math.PI) / 180) * (t.r * 0.55)).toFixed(3)})`}
          >
            <rect x="-30" y="-12" width="60" height="22" rx="11"
                  fill="rgba(5,6,10,0.55)" stroke={c.secondary} strokeWidth="1.5" />
            <text x="0" y="4" textAnchor="middle"
                  fontFamily="Clash Display, system-ui" fontWeight="700"
                  fontSize="10" fill={c.secondary} letterSpacing="2">{t.label}</text>
          </g>
        </motion.g>
      ))}

      {/* Engraved label */}
      <text x="200" y="450" textAnchor="middle"
            fontFamily="Clash Display, system-ui" fontWeight="700"
            fontSize="14" fill={c.secondary} letterSpacing="6">CONCIERGE</text>
    </g>
  );
}

/* ─────────────────────────── MASTERY ───────────────────────── */
/** New mentorship illustration — replaces the chess board.
 *  A floating golden crown levitating above a hexagonal pedestal,
 *  with a bright gem in the centre and orbiting stars. Reads as
 *  "ascend / mastery / inner circle". */
function MasteryScene({ c, kind, glowFilter }: { c: any; kind: string; glowFilter?: string }) {
  return (
    <g filter={glowFilter}>
      {/* Beam of light */}
      <motion.polygon
        points="200,80 150,420 250,420"
        fill={c.secondary}
        animate={{ opacity: [0.08, 0.22, 0.08] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Hexagonal pedestal */}
      <g transform="translate(200,360)" stroke={`url(#pi-stroke-${kind})`} strokeWidth="2" fill={c.soft}>
        <polygon points="-70,0 -35,-22 35,-22 70,0 35,22 -35,22" />
        <polygon points="-70,0 -35,28 35,28 70,0 35,22 -35,22" fill="rgba(5,6,10,0.5)" />
        <line x1="-70" y1="0" x2="-70" y2="20" />
        <line x1="70" y1="0" x2="70" y2="20" />
      </g>

      {/* Levitating gem */}
      <g transform="translate(200,250)">
      <motion.g
        animate={{ y: [0, -10, 0], rotate: [0, 360] }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 18, repeat: Infinity, ease: "linear" },
        }}
        style={{ transformOrigin: "0px 0px" }}
      >
        <polygon points="0,-32 26,0 0,38 -26,0" fill={c.primary} stroke={c.secondary} strokeWidth="2" />
        <polygon points="0,-32 12,-10 -12,-10" fill={c.secondary} opacity="0.85" />
        <polygon points="0,38 12,10 -12,10" fill="#05060a" opacity="0.4" />
      </motion.g>
      </g>

      {/* Floating crown above the gem */}
      <g transform="translate(200,180)">
      <motion.g
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Base band */}
        <rect x="-40" y="20" width="80" height="14" rx="3"
              fill={c.primary} stroke={c.secondary} strokeWidth="2" />
        {/* Three peaks of the crown */}
        <path
          d="M-40,20 L-25,-10 L-10,12 L0,-22 L10,12 L25,-10 L40,20 Z"
          fill={c.primary}
          stroke={c.secondary}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Gems on each peak */}
        <circle cx="-25" cy="-2" r="3.5" fill={c.secondary} />
        <circle cx="0"   cy="-12" r="4.5" fill="#fff8e6" />
        <circle cx="25"  cy="-2" r="3.5" fill={c.secondary} />
        {/* Band detail */}
        <line x1="-40" y1="27" x2="40" y2="27" stroke={c.secondary} strokeWidth="0.8" opacity="0.7" />
        <circle cx="-22" cy="27" r="1.5" fill={c.secondary} />
        <circle cx="0"   cy="27" r="1.5" fill={c.secondary} />
        <circle cx="22"  cy="27" r="1.5" fill={c.secondary} />
      </motion.g>
      </g>

      {/* Orbiting stars around the crown */}
      {[0, 120, 240].map((a, i) => (
        <motion.g
          key={i}
          animate={{ rotate: 360 }}
          transition={{ duration: 14 + i * 4, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "200px 200px", transformBox: "fill-box" }}
        >
          <g transform={`translate(${(200 + Math.cos((a * Math.PI) / 180) * 110).toFixed(3)}, ${(200 + Math.sin((a * Math.PI) / 180) * 60).toFixed(3)})`}>
            <path d="M0,-10 L2.5,-2.5 L10,0 L2.5,2.5 L0,10 L-2.5,2.5 L-10,0 L-2.5,-2.5 Z"
                  fill={c.secondary} />
          </g>
        </motion.g>
      ))}

      {/* Engraved label */}
      <text x="200" y="450" textAnchor="middle"
            fontFamily="Clash Display, system-ui" fontWeight="700"
            fontSize="14" fill={c.secondary} letterSpacing="6">MASTERY</text>
    </g>
  );
}


/* ────────────────────────────────────────────────────────────────────
 * Mobile-aware wrapper.
 *
 * The illustration above uses 24 infinite-repeat framer-motion
 * animations across 25 motion.* elements. Each PathCard mounts one
 * — and the mobile carousel keeps all 5 cards mounted in the cube,
 * so on mobile we'd be running ~120 concurrent infinite animations
 * on a single section. That was THE dominant remaining mobile lag
 * source after the Round-14 GPU-layer optimisations.
 *
 * <MotionConfig reducedMotion="always"> tells framer-motion to
 * treat every nested motion.* as if the user has prefers-reduced-
 * motion enabled: animations are skipped, initial values jump to
 * final values, and the framework never enters its rAF loop for
 * those elements. The illustrations still RENDER (their static
 * SVG geometry and gradients are unchanged) — they just don't
 * animate, exactly the behaviour the user wanted ("dont remove
 * animations just fix the lag" — animations are still active on
 * desktop where there's GPU budget for them).
 * ────────────────────────────────────────────────────────────────── */
export default function PathIllustration(props: {
  kind: PathIllustrationKind;
  accent: keyof typeof ACCENT_TO_HEX;
  /** Pass false for non-active Swiper slides to freeze their animations.
   *  Only the visible/active slide should have live framer-motion animations —
   *  running 25 infinite animations × 5 slides = 125 concurrent rAF callbacks
   *  was the dominant remaining mobile lag source. Default: true. */
  animated?: boolean;
  /** Skip SVG <filter url(#…)> refs (iOS Safari 3D-transform bug). */
  noFilter?: boolean;
}) {
  const freeze = props.animated === false;
  return (
    <MotionConfig reducedMotion={freeze ? "always" : "user"}>
      <PathIllustrationContent
        kind={props.kind}
        accent={props.accent}
        noFilter={props.noFilter}
      />
    </MotionConfig>
  );
}
