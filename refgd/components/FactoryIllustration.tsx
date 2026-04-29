"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

const svgCoord = (value: number) => Number(value.toFixed(3));

/**
 * FactoryIllustration
 * ──────────────────────────────────────────────────────────────────
 * A wide, horizontal SVG "factory of methods" — drawn in the same flat
 * design-illustration style as the rest of the page (no realistic /
 * cinematic 3D). The whole panel is transparent so the page's existing
 * dark backdrop shows through. Belts, gears, smokestacks and pipes
 * animate continuously.
 *
 * Why SVG and not Three.js / Spline:
 *   - Matches the editorial flat-illustration aesthetic of the rest
 *     of the mentorship page (puppet-brain, refund-engine, etc.).
 *   - Stays light: ~5KB on the wire, no GPU contexts, animates via
 *     framer-motion + CSS transforms only.
 *   - Respects prefers-reduced-motion automatically.
 */
export default function FactoryIllustration({
  className = "",
  height = 520,
}: {
  className?: string;
  /** Pixel height. Width is fluid (svg viewBox 1600×520). */
  height?: number;
}) {
  const reduce = useReducedMotion();

    // Each instance gets a unique id-suffix so two instances on the page
    // (mobile + desktop variants) don't collide on shared <defs> ids
    // — without this the second SVG references the first SVG's gradient
    // resources and renders mostly invisible.
    const rawUid = useId();
    const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, "");
    const lineId = `factory-line-${uid}`;
    const fillId = `factory-fill-${uid}`;
    const sparkId = `factory-spark-${uid}`;
    const beltId = `belt-dash-${uid}`;

  // Belt / gear loop durations
  const beltDur = reduce ? 0 : 6;
  const gearLargeDur = reduce ? 0 : 8;
  const gearMidDur = reduce ? 0 : 5;
  const gearSmallDur = reduce ? 0 : 3.4;
  const smokeDur = reduce ? 0 : 4.5;

  return (
    <div
      className={`relative w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1600 520"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Soft amber → cyan editorial accent gradient used across page */}
          <linearGradient id={lineId} x1="0" x2="1">
            <stop offset="0%" stopColor="#f5b945" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#e879f9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f5b945" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id={sparkId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#f5b945" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f5b945" stopOpacity="0" />
          </radialGradient>
          {/* Belt dash pattern for "moving" stripes */}
          <pattern
            id={beltId}
            x="0"
            y="0"
            width="40"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <rect x="0" y="0" width="40" height="14" fill="#0a0816" />
            <rect x="0" y="0" width="20" height="14" fill={`url(#${lineId})`} opacity="0.55" />
          </pattern>
        </defs>

        {/* ─── Ground baseline ──────────────────────────────────── */}
        <line
          x1="40"
          y1="470"
          x2="1560"
          y2="470"
          stroke={`url(#${lineId})`}
          strokeWidth="1.5"
          strokeOpacity="0.45"
        />
        {/* Tick marks beneath the ground */}
        {Array.from({ length: 38 }, (_, i) => 40 + i * 40).map((x) => (
          <line
            key={`t-${x}`}
            x1={x}
            y1="475"
            x2={x}
            y2="488"
            stroke={`url(#${lineId})`}
            strokeWidth="1"
            strokeOpacity="0.25"
          />
        ))}

        {/* ─── Main factory body — outline rectangle with peaked roof */}
        <g stroke={`url(#${lineId})`} strokeWidth="2.2" fill={`url(#${fillId})`}>
          {/* Roof saw-tooth (classic factory silhouette) */}
          <path d="M 240 230 L 320 170 L 320 230 L 400 170 L 400 230 L 480 170 L 480 230 L 560 170 L 560 230 L 640 170 L 640 230 Z" />
          {/* Body */}
          <rect x="240" y="230" width="700" height="240" rx="6" />
          {/* Door */}
          <rect x="290" y="380" width="70" height="90" />
          {/* Windows row */}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={`w-${i}`}
              x={400 + i * 96}
              y={290}
              width="64"
              height="56"
              rx="3"
              opacity="0.85"
            />
          ))}
        </g>

        {/* Smokestacks */}
        <g stroke={`url(#${lineId})`} strokeWidth="2" fill={`url(#${fillId})`}>
          <rect x="700" y="120" width="34" height="120" rx="2" />
          <rect x="760" y="80" width="40" height="160" rx="2" />
          <line x1="700" y1="135" x2="734" y2="135" />
          <line x1="760" y1="98" x2="800" y2="98" />
        </g>

        {/* Animated smoke puffs */}
        {[
          { cx: 717, cy: 100, r: 18, delay: 0 },
          { cx: 717, cy: 100, r: 22, delay: 1.4 },
          { cx: 717, cy: 100, r: 16, delay: 2.6 },
          { cx: 780, cy: 60, r: 24, delay: 0.6 },
          { cx: 780, cy: 60, r: 28, delay: 2.0 },
          { cx: 780, cy: 60, r: 20, delay: 3.4 },
        ].map((p, i) => (
          <motion.circle
            key={`smoke-${i}`}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill={`url(#${lineId})`}
            initial={{ opacity: 0, scale: 0.4, y: 0 }}
            animate={
              reduce
                ? { opacity: 0.18 }
                : { opacity: [0, 0.32, 0], scale: [0.4, 1.4, 1.8], y: [0, -90, -160] }
            }
            transition={{
              duration: smokeDur,
              repeat: reduce ? 0 : Infinity,
              delay: p.delay,
              ease: "easeOut",
            }}
            style={{ transformOrigin: `${p.cx}px ${p.cy}px`, opacity: 0.18 }}
          />
        ))}

        {/* ─── Conveyor belts ──────────────────────────────────── */}
        {/* Upper belt — left side */}
        <g>
          <rect
            x="60"
            y="260"
            width="180"
            height="14"
            fill={`url(#${beltId})`}
            opacity="0.85"
          />
          {/* Belt rollers */}
          {[60, 240].map((cx) => (
            <circle
              key={`r1-${cx}`}
              cx={cx}
              cy={267}
              r={14}
              fill="#0a0816"
              stroke={`url(#${lineId})`}
              strokeWidth="2"
            />
          ))}
          <motion.line
            x1="60"
            y1="267"
            x2="240"
            y2="267"
            stroke="#fcd34d"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            animate={reduce ? {} : { x1: [60, 80], x2: [240, 260] }}
            transition={{
              duration: beltDur,
              repeat: reduce ? 0 : Infinity,
              ease: "linear",
            }}
            opacity="0.55"
          />
        </g>

        {/* Lower belt — right side */}
        <g>
          <rect
            x="940"
            y="350"
            width="600"
            height="14"
            fill={`url(#${beltId})`}
            opacity="0.85"
          />
          {/* Belt rollers */}
          {[940, 1240, 1540].map((cx) => (
            <circle
              key={`r2-${cx}`}
              cx={cx}
              cy={357}
              r={14}
              fill="#0a0816"
              stroke={`url(#${lineId})`}
              strokeWidth="2"
            />
          ))}
          <motion.line
            x1="940"
            y1="357"
            x2="1540"
            y2="357"
            stroke="#7dd3fc"
            strokeWidth="1.2"
            strokeDasharray="6 8"
            animate={reduce ? {} : { x1: [940, 960], x2: [1540, 1560] }}
            transition={{
              duration: beltDur,
              repeat: reduce ? 0 : Infinity,
              ease: "linear",
            }}
            opacity="0.6"
          />
        </g>

        {/* Crates moving along the lower belt — these represent
            "methods" being shipped out. */}
        {[0, 1, 2, 3].map((i) => (
          <motion.g
            key={`crate-${i}`}
            initial={{ x: 0 }}
            animate={reduce ? { x: 0 } : { x: [0, 600] }}
            transition={{
              duration: beltDur * 2.6,
              repeat: reduce ? 0 : Infinity,
              delay: i * (beltDur * 0.65),
              ease: "linear",
            }}
          >
            <g transform={`translate(${950 + i * -220}, 320)`}>
              <rect
                width="36"
                height="30"
                fill={`url(#${fillId})`}
                stroke={`url(#${lineId})`}
                strokeWidth="1.6"
              />
              <line x1="18" y1="0" x2="18" y2="30" stroke={`url(#${lineId})`} strokeWidth="1.2" opacity="0.6" />
              <line x1="0" y1="15" x2="36" y2="15" stroke={`url(#${lineId})`} strokeWidth="1.2" opacity="0.6" />
            </g>
          </motion.g>
        ))}

        {/* ─── Gears ──────────────────────────────────────────── */}
        <Gear cx={1080} cy={210} r={70} teeth={14} duration={gearLargeDur} reduce={!!reduce} lineId={lineId} fillId={fillId} />
        <Gear cx={1180} cy={140} r={42} teeth={11} duration={gearMidDur} reverse reduce={!!reduce} lineId={lineId} fillId={fillId} />
        <Gear cx={1260} cy={220} r={54} teeth={12} duration={gearSmallDur} reduce={!!reduce} lineId={lineId} fillId={fillId} />
        <Gear cx={1390} cy={170} r={36} teeth={10} duration={gearMidDur * 0.8} reverse reduce={!!reduce} lineId={lineId} fillId={fillId} />

        {/* ─── Pipes connecting the building to the gears ────── */}
        <g
          fill="none"
          stroke={`url(#${lineId})`}
          strokeWidth="3"
          strokeOpacity="0.6"
          strokeLinecap="round"
        >
          <path d="M 940 280 C 1000 280 1000 220 1080 220" />
          <path d="M 940 320 C 1010 320 1010 260 1100 260" />
        </g>

        {/* ─── Sparks flying off the bottom-right gear ────────── */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.circle
            key={`spark-${i}`}
            cx={1260}
            cy={220}
            r={6}
            fill={`url(#${sparkId})`}
            initial={{ opacity: 0 }}
            animate={
              reduce
                ? { opacity: 0.25 }
                : {
                    opacity: [0, 0.95, 0],
                    cx: [1260, 1260 + (i - 2) * 50],
                    cy: [220, 220 + (i % 2 === 0 ? 60 : -50)],
                  }
            }
            transition={{
              duration: 1.6,
              repeat: reduce ? 0 : Infinity,
              delay: i * 0.32,
              ease: "easeOut",
            }}
          />
        ))}

        {/* ─── Antenna / radio dish on roof ───────────────────── */}
        <g stroke={`url(#${lineId})`} strokeWidth="2" fill="none">
          <line x1="900" y1="230" x2="900" y2="160" />
          <circle cx="900" cy="160" r="8" fill={`url(#${fillId})`} />
          <motion.circle
            cx="900"
            cy="160"
            r="14"
            stroke="#fcd34d"
            strokeOpacity="0.7"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={reduce ? { opacity: 0.4 } : { scale: [0.6, 2.4], opacity: [0.7, 0] }}
            transition={{ duration: 2.2, repeat: reduce ? 0 : Infinity, ease: "easeOut" }}
            style={{ transformOrigin: "900px 160px" }}
          />
          <motion.circle
            cx="900"
            cy="160"
            r="14"
            stroke="#fcd34d"
            strokeOpacity="0.5"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={reduce ? { opacity: 0.25 } : { scale: [0.6, 2.4], opacity: [0.5, 0] }}
            transition={{
              duration: 2.2,
              repeat: reduce ? 0 : Infinity,
              ease: "easeOut",
              delay: 1.1,
            }}
            style={{ transformOrigin: "900px 160px" }}
          />
        </g>

        {/* ─── Mini icons floating overhead — money / lock / shield */}
        <FloatingIcon x={140} y={150} delay={0} reduce={!!reduce} lineId={lineId} fillId={fillId}>
          {/* dollar */}
          <path d="M 0 -14 L 0 14 M -8 -8 C -8 -12 -4 -14 0 -14 C 4 -14 8 -12 8 -8 C 8 -4 4 -2 0 -2 C -4 -2 -8 0 -8 4 C -8 8 -4 10 0 10 C 4 10 8 8 8 4" />
        </FloatingIcon>
        <FloatingIcon x={1480} y={140} delay={1.4} reduce={!!reduce} lineId={lineId} fillId={fillId}>
          {/* shield */}
          <path d="M 0 -14 L 12 -8 L 12 4 C 12 12 0 16 0 16 C 0 16 -12 12 -12 4 L -12 -8 Z" />
          <path d="M -4 0 L -1 4 L 5 -3" />
        </FloatingIcon>
        <FloatingIcon x={80} y={380} delay={0.7} reduce={!!reduce} lineId={lineId} fillId={fillId}>
          {/* lock */}
          <rect x="-9" y="-2" width="18" height="14" rx="2" />
          <path d="M -6 -2 L -6 -8 C -6 -12 -3 -14 0 -14 C 3 -14 6 -12 6 -8 L 6 -2" />
        </FloatingIcon>
        <FloatingIcon x={1490} y={400} delay={2.1} reduce={!!reduce} lineId={lineId} fillId={fillId}>
          {/* gift */}
          <rect x="-12" y="-4" width="24" height="16" rx="1.5" />
          <line x1="0" y1="-4" x2="0" y2="12" />
          <path d="M -8 -4 C -10 -10 -2 -12 0 -4 C 2 -12 10 -10 8 -4" />
        </FloatingIcon>
      </svg>
    </div>
  );
}

/* ─────────────────────── Helper components ─────────────────────── */

function Gear({
  cx,
  cy,
  r,
  teeth,
  duration,
  reverse = false,
  reduce,
  lineId,
  fillId,
}: {
  cx: number;
  cy: number;
  r: number;
  teeth: number;
  duration: number;
  reverse?: boolean;
  reduce: boolean;
  lineId: string;
  fillId: string;
}) {
  // Build the tooth path procedurally.
  const innerR = r * 0.78;
  const toothH = r - innerR;
  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + 0.4) / teeth) * Math.PI * 2;
    const a2 = ((i + 0.6) / teeth) * Math.PI * 2;
    const a3 = ((i + 1) / teeth) * Math.PI * 2;
    points.push(
      `${svgCoord(innerR * Math.cos(a0))},${svgCoord(innerR * Math.sin(a0))}`,
      `${svgCoord((innerR + toothH) * Math.cos(a1))},${svgCoord((innerR + toothH) * Math.sin(a1))}`,
      `${svgCoord((innerR + toothH) * Math.cos(a2))},${svgCoord((innerR + toothH) * Math.sin(a2))}`,
      `${svgCoord(innerR * Math.cos(a3))},${svgCoord(innerR * Math.sin(a3))}`,
    );
  }
  const d =
    `M ${points[0]} ` +
    points
      .slice(1)
      .map((p) => `L ${p}`)
      .join(" ") +
    " Z";

  return (
    <motion.g
      style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: "view-box" as const }}
      animate={
        reduce
          ? { rotate: 0 }
          : { rotate: reverse ? -360 : 360 }
      }
      transition={{
        duration,
        repeat: reduce ? 0 : Infinity,
        ease: "linear",
      }}
    >
      <g transform={`translate(${cx} ${cy})`}>
        <path
          d={d}
          fill={`url(#${fillId})`}
          stroke={`url(#${lineId})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle r={innerR * 0.42} fill="#0a0816" stroke={`url(#${lineId})`} strokeWidth="1.6" />
        <circle r={innerR * 0.12} fill={`url(#${lineId})`} />
        {/* spokes */}
        {Array.from({ length: 6 }, (_, i) => i).map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <line
              key={`sp-${i}`}
              x1={svgCoord(innerR * 0.12 * Math.cos(a))}
              y1={svgCoord(innerR * 0.12 * Math.sin(a))}
              x2={svgCoord(innerR * 0.42 * Math.cos(a))}
              y2={svgCoord(innerR * 0.42 * Math.sin(a))}
              stroke={`url(#${lineId})`}
              strokeWidth="1.4"
              opacity="0.6"
            />
          );
        })}
      </g>
    </motion.g>
  );
}

function FloatingIcon({
  x,
  y,
  delay,
  reduce,
  children,
  lineId,
  fillId,
}: {
  x: number;
  y: number;
  delay: number;
  reduce: boolean;
  children: React.ReactNode;
  lineId: string;
  fillId: string;
}) {
  return (
    <motion.g
      style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" as const }}
      initial={{ opacity: 0.85 }}
      animate={
        reduce
          ? { opacity: 0.85 }
          : { y: [0, -10, 0], opacity: [0.7, 1, 0.7] }
      }
      transition={{
        duration: 4 + delay,
        repeat: reduce ? 0 : Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      <g transform={`translate(${x} ${y})`}>
        <circle r="22" fill={`url(#${fillId})`} stroke={`url(#${lineId})`} strokeWidth="1.5" />
        <g
          stroke={`url(#${lineId})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {children}
        </g>
      </g>
    </motion.g>
  );
}
