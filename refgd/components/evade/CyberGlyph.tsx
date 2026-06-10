"use client";
import { useId } from "react";

/**
 * CyberGlyph — threat-intelligence line-art glyph set for the Evade
 * redesign. Static, always-visible (mirrors ParallaxIllustration v3:
 * any entrance animation under a mix-blend / overflow:hidden parent
 * caused WebKit vanishing). No SVG filters on the artwork, so it never
 * spawns its own expensive compositing layer.
 *
 * Gradient ids are derived from React useId() so the same kind+accent
 * can render twice on a page without the duplicate-id collision that
 * silently breaks the second instance's stroke fill.
 *
 * These replace the generic store/chess/globe/spark line-art with
 * motifs that read unmistakably as cyber-defense: radar sweep, node
 * mesh, fingerprint, scanning shield, terminal, hex honeypot, target
 * reticle, anomaly waveform, and a circuit padlock.
 */

export type CyberGlyphKind =
  | "radar"
  | "nodemesh"
  | "fingerprint"
  | "shieldscan"
  | "terminal"
  | "hexgrid"
  | "crosshair"
  | "waveform"
  | "lockkey";

const ACCENTS: Record<string, string> = {
  amber: "#ffd06b",
  violet: "#b196ff",
  cyan: "#7be7ff",
  fuchsia: "#ff8ed1",
  emerald: "#7eecc1",
  rose: "#ff8aa1",
  gold: "#ffe28a",
};

export default function CyberGlyph({
  kind,
  accent = "cyan",
  className = "",
  size = 240,
  strokeWidth = 2.2,
}: {
  kind: CyberGlyphKind;
  accent?: keyof typeof ACCENTS;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const c = ACCENTS[accent] ?? ACCENTS.cyan;
  const uid = useId().replace(/[:]/g, "");
  const lineId = `cg-line-${uid}`;
  const glowId = `cg-glow-${uid}`;

  const g = {
    stroke: `url(#${lineId})`,
    strokeWidth,
    fill: "none" as const,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  return (
    <div className={`pointer-events-none ${className}`} style={{ position: "relative" }}>
      <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id={glowId} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={c} stopOpacity="0.9" />
            <stop offset="55%" stopColor={c} stopOpacity="0.32" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor={c} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        <circle cx="120" cy="120" r="112" fill={`url(#${glowId})`} opacity="0.3" />

        {kind === "radar" && (
          <g {...g}>
            <circle cx="120" cy="120" r="78" opacity="0.45" />
            <circle cx="120" cy="120" r="52" opacity="0.6" />
            <circle cx="120" cy="120" r="26" opacity="0.8" />
            <path d="M120 42v156M42 120h156" opacity="0.35" />
            <path d="M120 120L186 78" />
            <path d="M120 120l66 -42 6 30z" fill={c} fillOpacity="0.14" stroke="none" />
            <circle cx="162" cy="92" r="4.5" fill={c} stroke="none" />
            <circle cx="88" cy="150" r="3" fill={c} stroke="none" opacity="0.7" />
          </g>
        )}

        {kind === "nodemesh" && (
          <g {...g}>
            <path d="M64 70 L150 56 L186 120 L132 176 L58 150 Z" opacity="0.5" />
            <path d="M64 70 L132 176 M150 56 L58 150 M186 120 L64 70 M150 56 L132 176" opacity="0.3" />
            <circle cx="64" cy="70" r="7" fill={c} fillOpacity="0.18" />
            <circle cx="150" cy="56" r="7" fill={c} fillOpacity="0.18" />
            <circle cx="186" cy="120" r="7" fill={c} fillOpacity="0.18" />
            <circle cx="132" cy="176" r="7" fill={c} fillOpacity="0.18" />
            <circle cx="58" cy="150" r="7" fill={c} fillOpacity="0.18" />
            <circle cx="118" cy="112" r="9" fill={c} fillOpacity="0.28" />
          </g>
        )}

        {kind === "fingerprint" && (
          <g {...g}>
            <path d="M76 138c-6-40 18-72 44-72 30 0 46 26 44 56" opacity="0.85" />
            <path d="M90 150c-6-34 12-58 30-58 22 0 34 18 32 44" opacity="0.7" />
            <path d="M104 162c-4-28 6-46 16-46 14 0 22 12 20 32" opacity="0.6" />
            <path d="M118 168c-2-22 2-34 4-34" opacity="0.5" />
            <path d="M66 96c14-28 44-40 74-30M150 176c8-14 12-30 10-46" opacity="0.4" />
          </g>
        )}

        {kind === "shieldscan" && (
          <g {...g}>
            <path d="M120 44l58 20v48c0 40-30 68-58 86-28-18-58-46-58-86V64z" fill={c} fillOpacity="0.07" />
            <path d="M82 116h76" opacity="0.95" />
            <path d="M92 100h56M98 132h44" opacity="0.4" />
            <circle cx="158" cy="116" r="3.5" fill={c} stroke="none" />
          </g>
        )}

        {kind === "terminal" && (
          <g {...g}>
            <rect x="52" y="62" width="136" height="116" rx="12" opacity="0.7" />
            <path d="M52 88h136" opacity="0.45" />
            <circle cx="68" cy="75" r="3.2" fill={c} stroke="none" />
            <circle cx="80" cy="75" r="3.2" fill={c} stroke="none" opacity="0.6" />
            <circle cx="92" cy="75" r="3.2" fill={c} stroke="none" opacity="0.4" />
            <path d="M72 112l16 12-16 12" />
            <path d="M100 138h44" />
            <rect x="150" y="150" width="14" height="14" rx="2" fill={c} fillOpacity="0.5" stroke="none" />
          </g>
        )}

        {kind === "hexgrid" && (
          <g {...g}>
            {[
              [120, 70], [86, 92], [154, 92], [86, 136], [154, 136], [120, 158],
            ].map(([x, y], i) => {
              const r = 20;
              const pts = Array.from({ length: 6 }, (_, k) => {
                const a = (Math.PI / 3) * k - Math.PI / 6;
                return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
              }).join(" ");
              return <polygon key={i} points={pts} opacity={i === 0 ? 0.95 : 0.45} fill={i === 0 ? c : "none"} fillOpacity={i === 0 ? 0.16 : 0} />;
            })}
          </g>
        )}

        {kind === "crosshair" && (
          <g {...g}>
            <circle cx="120" cy="120" r="66" opacity="0.55" />
            <circle cx="120" cy="120" r="40" opacity="0.4" strokeDasharray="6 8" />
            <path d="M120 36v34M120 170v34M36 120h34M170 120h34" />
            <circle cx="120" cy="120" r="6" fill={c} stroke="none" />
            <path d="M86 86l-10-10M154 86l10-10M86 154l-10 10M154 154l10 10" opacity="0.6" />
          </g>
        )}

        {kind === "waveform" && (
          <g {...g}>
            <path d="M40 120h22l10-44 16 78 14-58 12 40 14-22 12 30 14-16h32" />
            <path d="M40 158h160M40 82h160" opacity="0.2" />
            <circle cx="104" cy="154" r="3.5" fill={c} stroke="none" />
          </g>
        )}

        {kind === "lockkey" && (
          <g {...g}>
            <rect x="74" y="108" width="92" height="74" rx="12" fill={c} fillOpacity="0.07" />
            <path d="M92 108V90a28 28 0 0 1 56 0v18" />
            <circle cx="120" cy="138" r="10" />
            <path d="M120 148v18" />
            <path d="M56 145h18M166 145h18" opacity="0.45" />
          </g>
        )}
      </svg>
    </div>
  );
}
