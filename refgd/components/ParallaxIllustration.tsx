"use client";

/**
 * ParallaxIllustration v3 — STATIC always-visible illustration.
 *
 * v2 used WAAPI + IO for a fade entrance. Combined with parent
 * `mix-blend-mode: screen` and `overflow:hidden` on solution
 * cards, the brief transition window made the SVG appear to
 * vanish or render as a transparent gap in some WebKit builds.
 *
 * v3 removes all animation. The illustration renders at opacity:1
 * always. SSR, hydration, scroll-in, scroll-out, rescroll — every
 * state shows the SVG. Cannot vanish.
 *
 * Containing components are responsible for any entrance reveal
 * (SafeReveal already wraps their card containers).
 */

export type IllustrationKind =
  | "store"
  | "shield"
  | "chess"
  | "spark"
  | "encryption"
  | "globe";

const ACCENTS: Record<string, string> = {
  amber: "#ffd06b",
  violet: "#b196ff",
  cyan: "#7be7ff",
  fuchsia: "#ff8ed1",
  emerald: "#7eecc1",
  rose: "#ff8aa1",
  gold: "#ffe28a",
};

export default function ParallaxIllustration({
  kind,
  accent = "amber",
  className = "",
  size = 280,
}: {
  kind: IllustrationKind;
  accent?: keyof typeof ACCENTS;
  className?: string;
  size?: number;
}) {
  const c = ACCENTS[accent] ?? ACCENTS.amber;

  return (
    <div
      style={{ position: "relative" }}
      className={`pointer-events-none ${className}`}
    >
      <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id={`pg-${kind}-${accent}`} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={c} stopOpacity="0.95" />
            <stop offset="55%" stopColor={c} stopOpacity="0.4" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id={`pg-${kind}-${accent}-line`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor={c} stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <circle
          cx="120"
          cy="120"
          r="110"
          fill={`url(#pg-${kind}-${accent})`}
          opacity="0.35"
        />
        {kind === "store" && (
          <g
            stroke={`url(#pg-${kind}-${accent}-line)`}
            strokeWidth="2.5"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M70 95h100l-9 90H79z" />
            <path d="M95 95v-12a25 25 0 0 1 50 0v12" />
            <circle cx="120" cy="55" r="3" fill={c} />
            <path d="M55 70l8 4-8 4" />
            <path d="M185 70l-8 4 8 4" />
            <path d="M110 130l8 8 14-16" />
          </g>
        )}
        {kind === "shield" && (
          <g
            stroke={`url(#pg-${kind}-${accent}-line)`}
            strokeWidth="2.5"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path
              d="M120 40l60 20v50c0 40-30 70-60 90-30-20-60-50-60-90V60z"
              fill={c}
              fillOpacity="0.08"
            />
            <path d="M95 122l18 18 32-40" />
            <path d="M75 70l-10 4 10 4M165 70l10 4-10 4" />
          </g>
        )}
        {kind === "chess" && (
          <g
            stroke={`url(#pg-${kind}-${accent}-line)`}
            strokeWidth="2.5"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M95 65v-12M120 65v-15M145 65v-12M120 50v-12M114 38h12" />
            <path d="M88 65h64l-8 50h-48z" />
            <path d="M82 125h76l-6 18h-64z" />
            <path d="M78 150h84l-8 30h-68z" />
          </g>
        )}
        {kind === "spark" && (
          <g
            stroke={`url(#pg-${kind}-${accent}-line)`}
            strokeWidth="2.5"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M120 50l18 50 52 20-52 20-18 50-18-50-52-20 52-20z" />
            <circle cx="120" cy="120" r="6" fill={c} />
          </g>
        )}
        {kind === "encryption" && (
          <g
            stroke={`url(#pg-${kind}-${accent}-line)`}
            strokeWidth="2.5"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <circle cx="95" cy="120" r="42" />
            <circle cx="145" cy="120" r="42" />
            <path d="M120 95v50" />
          </g>
        )}
        {kind === "globe" && (
          <g
            stroke={`url(#pg-${kind}-${accent}-line)`}
            strokeWidth="2.5"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <circle cx="120" cy="120" r="65" />
            <ellipse cx="120" cy="120" rx="65" ry="28" />
            <ellipse cx="120" cy="120" rx="28" ry="65" />
            <path d="M55 120h130M120 55v130" />
          </g>
        )}
      </svg>
    </div>
  );
}
