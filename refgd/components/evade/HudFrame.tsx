"use client";
import type { CSSProperties, ReactNode } from "react";

/**
 * HudFrame — sparse heads-up-display chrome for the Evade redesign.
 *
 * Deliberately NOT a drop-in replacement for the old rounded-[2rem]
 * gradient glass panel (that uniform wrapper is exactly what made the
 * page read as repetitive). HudFrame only adds technical FURNITURE
 * around its children — corner brackets, a hairline edge, an optional
 * monospace section tag + status readout. It owns no editable content;
 * all EditableText/EditableImage stay in the section files so every
 * admin editId is preserved.
 *
 * Variants:
 *   "panel"  — faint tinted surface + hairline border + corner brackets
 *   "bare"   — corner brackets + tag only, transparent (full-bleed)
 *
 * Performance: pure static DOM. No animation, no filter, no
 * backdrop-filter. Safe on the compositor.
 */

const RGB: Record<string, string> = {
  cyan: "34,211,238",
  violet: "167,139,250",
  amber: "245,185,69",
  fuchsia: "232,121,249",
  rose: "244,114,182",
  emerald: "52,211,153",
};

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

function Bracket({ pos, rgb }: { pos: "tl" | "tr" | "bl" | "br"; rgb: string }) {
  const base: CSSProperties = {
    position: "absolute",
    width: 22,
    height: 22,
    borderColor: `rgba(${rgb},0.55)`,
    borderStyle: "solid",
    pointerEvents: "none",
  };
  const map: Record<string, CSSProperties> = {
    tl: { top: 10, left: 10, borderWidth: "1.5px 0 0 1.5px" },
    tr: { top: 10, right: 10, borderWidth: "1.5px 1.5px 0 0" },
    bl: { bottom: 10, left: 10, borderWidth: "0 0 1.5px 1.5px" },
    br: { bottom: 10, right: 10, borderWidth: "0 1.5px 1.5px 0" },
  };
  return <span aria-hidden style={{ ...base, ...map[pos] }} />;
}

export default function HudFrame({
  children,
  accent = "cyan",
  variant = "panel",
  tag,
  status,
  className = "",
  contentClassName = "",
  style,
}: {
  children: ReactNode;
  accent?: keyof typeof RGB;
  variant?: "panel" | "bare";
  /** Decorative monospace section id e.g. "SEC.01 // DEEP_DIVE". */
  tag?: string;
  /** Decorative monospace status readout e.g. "● SECURE". */
  status?: string;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
}) {
  const rgb = RGB[accent] ?? RGB.cyan;

  const panelStyle: CSSProperties =
    variant === "panel"
      ? {
          background:
            `linear-gradient(180deg, rgba(${rgb},0.05), rgba(8,10,20,0.62) 60%, rgba(8,10,20,0.72))`,
          boxShadow:
            `inset 0 0 0 1px rgba(${rgb},0.14), 0 40px 120px -50px rgba(0,0,0,0.9)`,
        }
      : {};

  return (
    <div
      className={`relative ${className}`}
      style={{ ...panelStyle, ...style }}
    >
      {/* hairline top accent rule */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-10 right-10 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.7) 18%, rgba(${rgb},0.7) 82%, transparent)` }}
      />

      <Bracket pos="tl" rgb={rgb} />
      <Bracket pos="tr" rgb={rgb} />
      <Bracket pos="bl" rgb={rgb} />
      <Bracket pos="br" rgb={rgb} />

      {(tag || status) && (
        <div
          className="pointer-events-none absolute inset-x-0 top-3 flex items-center justify-between px-12"
          style={{ fontFamily: MONO }}
        >
          {tag ? (
            <span
              className="text-[10px] font-medium uppercase tracking-[0.28em]"
              style={{ color: `rgba(${rgb},0.85)` }}
            >
              {tag}
            </span>
          ) : <span />}
          {status ? (
            <span
              className="hidden text-[10px] font-medium uppercase tracking-[0.28em] sm:inline"
              style={{ color: `rgba(${rgb},0.6)` }}
            >
              {status}
            </span>
          ) : <span />}
        </div>
      )}

      <div className={contentClassName}>{children}</div>
    </div>
  );
}
