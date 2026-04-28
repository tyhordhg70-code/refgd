"use client";

import EditableText from "@/components/EditableText";
import type { CSSProperties } from "react";

/**
 * ChapterPill — rounded badge used as the eyebrow above a chapter
 * title. Replaces the old plain `— chapter 0X / xyz` dash text with
 * a glowing pill (border + accent dot + halo) so chapter intros feel
 * like editorial markers instead of inline notes.
 *
 * The underlying text is editable via `EditableText` so admins can
 * still rename the chapter inline. The pill chrome lives outside
 * the editable region so the editing affordance stays focused on
 * the words themselves.
 */
type Accent = "cyan" | "violet" | "amber" | "fuchsia" | "rose" | "emerald" | "white";

const ACCENT_RGB: Record<Accent, string> = {
  cyan: "34,211,238",
  violet: "167,139,250",
  amber: "245,185,69",
  fuchsia: "232,121,249",
  rose: "244,114,182",
  emerald: "52,211,153",
  white: "226,232,240",
};
const ACCENT_TEXT: Record<Accent, string> = {
  cyan: "text-cyan-300",
  violet: "text-violet-300",
  amber: "text-amber-300",
  fuchsia: "text-fuchsia-300",
  rose: "text-rose-300",
  emerald: "text-emerald-300",
  white: "text-white/85",
};

export default function ChapterPill({
  editId,
  defaultValue,
  accent = "cyan",
  size = "md",
  className = "",
}: {
  /** Stable content-block id so admins can edit the chapter text. */
  editId: string;
  /** Default text e.g. "chapter 01 / refund". A leading "— " is
   *  stripped if present so the pill chrome supplies its own marker. */
  defaultValue: string;
  accent?: Accent;
  /** `sm` matches the old `text-[10px] sm:text-xs` chapter eyebrow.
   *  `md` matches the old `text-xs sm:text-sm` chapter eyebrow. */
  size?: "sm" | "md";
  className?: string;
}) {
  const rgb = ACCENT_RGB[accent];
  const txt = ACCENT_TEXT[accent];
  // Trim a leading "— " or "- " so the dot supplies the visual marker.
  const cleaned = defaultValue.replace(/^[—-]\s*/u, "");

  const sizeClass =
    size === "sm"
      ? "px-3 py-1 text-[10px] sm:text-[11px] tracking-[0.4em] sm:tracking-[0.45em]"
      : "px-4 py-1.5 text-[11px] sm:text-xs tracking-[0.45em] sm:tracking-[0.5em]";

  const pillStyle: CSSProperties = {
    boxShadow: `inset 0 0 0 1px rgba(${rgb},0.30), 0 0 30px -10px rgba(${rgb},0.55)`,
    background: `linear-gradient(180deg, rgba(${rgb},0.08), rgba(255,255,255,0.02))`,
  };

  return (
    <span
      className={`heading-display relative inline-flex items-center gap-2 rounded-full border border-white/15 font-semibold uppercase ${sizeClass} ${txt} ${className}`}
      style={pillStyle}
      data-testid={`chapter-pill-${editId}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: `rgba(${rgb},1)`,
          boxShadow: `0 0 14px rgba(${rgb},0.95)`,
          animation: "chapterPillPulse 2.4s ease-in-out infinite",
        }}
      />
      <EditableText
        id={editId}
        defaultValue={cleaned}
        as="span"
        className="relative inline-block"
        style={{ textShadow: `0 0 18px rgba(${rgb},0.55)` }}
      />
    </span>
  );
}
