"use client";
import { motion } from "framer-motion";

export type PathIllustrationKind = "store" | "shield" | "chess" | "spark";

const ACCENT_TO_HEX: Record<string, { primary: string; secondary: string; soft: string }> = {
  gold:    { primary: "#f5b945", secondary: "#ffe28a", soft: "rgba(245,185,69,0.30)" },
  fuchsia: { primary: "#ec4899", secondary: "#f9a8d4", soft: "rgba(236,72,153,0.30)" },
  cyan:    { primary: "#22d3ee", secondary: "#a5f3fc", soft: "rgba(34,211,238,0.30)" },
  violet:  { primary: "#8b5cf6", secondary: "#c4b5fd", soft: "rgba(139,92,246,0.30)" },
  orange:  { primary: "#f97316", secondary: "#fdba74", soft: "rgba(249,115,22,0.30)" },
};

/**
 * Vector illustration set for the home path-cards. Inspired by the
 * original refundgod.io's flat illustrative style (no photographic
 * imagery). Each kind tells a small story:
 *   - store:  storefront grid with a spotlight beam
 *   - shield: hexagonal shield with deflected arrows
 *   - chess:  king + knight pair on an iso board
 *   - spark:  diamond with bursting rays (Buy Now)
 */
export default function PathIllustration({
  kind,
  accent,
}: {
  kind: PathIllustrationKind;
  accent: keyof typeof ACCENT_TO_HEX;
}) {
  const c = ACCENT_TO_HEX[accent];

  return (
    <motion.svg
      viewBox="0 0 400 500"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.1, ease: [0.25, 0.4, 0.25, 1] }}
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

      {/* Background atmospheric wash */}
      <rect x="0" y="0" width="400" height="500" fill={`url(#pi-bg-${kind})`} />

      {/* Subtle dotted grid overlay */}
      <g opacity="0.18">
        {Array.from({ length: 20 }).map((_, r) =>
          Array.from({ length: 16 }).map((_, col) => (
            <circle key={`${r}-${col}`} cx={col * 26 + 12} cy={r * 26 + 12} r="0.8" fill="white" />
          ))
        )}
      </g>

      {kind === "store" && <StoreScene c={c} kind={kind} />}
      {kind === "shield" && <ShieldScene c={c} kind={kind} />}
      {kind === "chess" && <ChessScene c={c} kind={kind} />}
      {kind === "spark" && <SparkScene c={c} kind={kind} />}

      {/* Floating accent dots (always present) */}
      <g>
        {[
          { x: 60,  y: 80,  r: 2.5 },
          { x: 320, y: 110, r: 1.8 },
          { x: 95,  y: 380, r: 2.2 },
          { x: 350, y: 320, r: 2.0 },
          { x: 200, y: 60,  r: 1.4 },
          { x: 280, y: 460, r: 1.6 },
        ].map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill={c.secondary}
            opacity="0.9"
            filter={`url(#pi-glow-${kind})`}
          >
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur={`${3 + (i % 4)}s`}
              repeatCount="indefinite"
              begin={`${i * 0.4}s`}
            />
          </circle>
        ))}
      </g>
    </motion.svg>
  );
}

function StoreScene({ c, kind }: { c: any; kind: string }) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      {/* Spotlight cone */}
      <polygon points="200,40 130,260 270,260" fill={c.secondary} opacity="0.10" />
      {/* Storefront grid */}
      <g transform="translate(80,180)" stroke={`url(#pi-stroke-${kind})`} strokeWidth="2" fill="none">
        {/* Awning */}
        <path d="M0,0 L240,0 L260,40 L-20,40 Z" fill={c.soft} />
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={i * (240 / 6)} y1="0" x2={i * (240 / 6) + 20} y2="40" />
        ))}
        {/* Building body */}
        <rect x="-20" y="40" width="280" height="180" rx="6" fill="rgba(5,6,10,0.28)" />
        {/* Door */}
        <rect x="100" y="120" width="40" height="100" rx="4" fill={c.soft} />
        <circle cx="134" cy="170" r="2" fill={c.secondary} />
        {/* Windows */}
        <rect x="10"  y="80"  width="60" height="30" rx="3" fill={c.soft} />
        <rect x="170" y="80"  width="60" height="30" rx="3" fill={c.soft} />
        <rect x="10"  y="135" width="60" height="60" rx="3" fill="rgba(5,6,10,0.45)" />
        <rect x="170" y="135" width="60" height="60" rx="3" fill="rgba(5,6,10,0.45)" />
        {/* Sale tag */}
        <g transform="translate(180,55)">
          <polygon points="0,0 26,0 36,10 26,20 0,20" fill={c.primary} />
          <circle cx="6" cy="10" r="1.8" fill="#05060a" />
        </g>
      </g>
      {/* Store sign */}
      <text x="200" y="160" textAnchor="middle"
            fontFamily="Clash Display, system-ui" fontWeight="700"
            fontSize="20" fill={c.secondary} letterSpacing="3">STORE</text>
    </g>
  );
}

function ShieldScene({ c, kind }: { c: any; kind: string }) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      {/* Shield body */}
      <g transform="translate(200,260)">
        <path
          d="M0,-110 L95,-72 L82,40 C80,90 40,128 0,140 C-40,128 -80,90 -82,40 L-95,-72 Z"
          fill={c.soft}
          stroke={`url(#pi-stroke-${kind})`}
          strokeWidth="3"
        />
        {/* Inner check */}
        <path d="M-32,-2 L-8,22 L34,-30" stroke={c.secondary} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Deflected arrows / cancel marks */}
      {[
        { x: 80,  y: 110, rot: 25 },
        { x: 320, y: 140, rot: -30 },
        { x: 100, y: 360, rot: 45 },
        { x: 310, y: 380, rot: -55 },
      ].map((a, i) => (
        <g key={i} transform={`translate(${a.x},${a.y}) rotate(${a.rot})`}>
          <line x1="0" y1="0" x2="46" y2="0" stroke={c.secondary} strokeWidth="2" opacity="0.7" />
          <polygon points="46,-5 56,0 46,5" fill={c.secondary} opacity="0.7" />
        </g>
      ))}
      {/* Tiny lock at top */}
      <g transform="translate(192,140)">
        <rect x="0" y="6" width="16" height="14" rx="2" fill={c.primary} />
        <path d="M3,6 V2 a5,5 0 0 1 10,0 V6" stroke={c.secondary} strokeWidth="2" fill="none" />
      </g>
    </g>
  );
}

function ChessScene({ c, kind }: { c: any; kind: string }) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      {/* Iso board */}
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
      {/* King silhouette */}
      <g transform="translate(170,150)" fill={c.secondary} stroke={c.primary} strokeWidth="2">
        <path d="M30,0 L30,18 M22,9 L38,9" strokeLinecap="round" strokeWidth="3" />
        <path d="M14,30 Q30,18 46,30 L52,80 L8,80 Z" />
        <ellipse cx="30" cy="30" rx="20" ry="7" />
        <rect x="6" y="80" width="48" height="14" rx="3" />
      </g>
      {/* Knight silhouette */}
      <g transform="translate(240,200)" fill={c.primary} opacity="0.9">
        <path d="M0,80 L0,52 Q0,28 18,18 Q24,8 36,8 Q48,8 50,22 Q60,30 56,52 L56,80 Z" stroke={c.secondary} strokeWidth="2" />
        <circle cx="22" cy="28" r="2.5" fill="#05060a" />
      </g>
    </g>
  );
}

function SparkScene({ c, kind }: { c: any; kind: string }) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      {/* Diamond */}
      <g transform="translate(200,250)" stroke={c.secondary} strokeWidth="3" fill={c.soft}>
        <polygon points="0,-90 80,0 0,90 -80,0" />
        <polygon points="0,-90 30,-30 -30,-30" fill={c.primary} opacity="0.55" />
        <polygon points="0,90 30,30 -30,30" fill={c.primary} opacity="0.45" />
        <line x1="-80" y1="0" x2="80" y2="0" />
        <line x1="-30" y1="-30" x2="30" y2="-30" />
        <line x1="-30" y1="30" x2="30" y2="30" />
      </g>
      {/* Bursting rays */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = i * 45;
        const r1 = 130, r2 = 170;
        const x1 = 200 + Math.cos((angle * Math.PI) / 180) * r1;
        const y1 = 250 + Math.sin((angle * Math.PI) / 180) * r1;
        const x2 = 200 + Math.cos((angle * Math.PI) / 180) * r2;
        const y2 = 250 + Math.sin((angle * Math.PI) / 180) * r2;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={c.secondary} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        );
      })}
      {/* Star sparkles */}
      {[
        { x: 80,  y: 130 },
        { x: 320, y: 150 },
        { x: 110, y: 380 },
        { x: 300, y: 360 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`}>
          <path d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" fill={c.secondary} opacity="0.9" />
        </g>
      ))}
    </g>
  );
}
