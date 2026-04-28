"use client";

import KineticText from "@/components/KineticText";
import ChapterPill from "@/components/ChapterPill";

/**
 * ChapterHeader — premium chapter intro card.
 *
 *  – Animated conic gradient ring around the panel (slow rotation
 *    of accent → white → accent stops).
 *  – Inherits liquid-glass-3d + liquid-glass-mobile so it visibly
 *    deforms on touch devices without a hover state.
 *  – Pulsing chapter pill instead of plain text.
 *  – Larger / heavier title typography with a strong drop-shadow
 *    so it always punches over the page galaxy.
 *
 * Originally lived inline inside /evade-cancelations/page.tsx —
 * extracted here so other editorial pages (mentorships, store-list,
 * etc.) can drop in the same look.
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

export default function ChapterHeader({
  chapterEditId,
  chapterDefault,
  titleEditId,
  titleDefault,
  accent = "cyan",
}: {
  /** Editable content id for the chapter pill text. */
  chapterEditId: string;
  /** Default chapter pill text e.g. "chapter 01 / evade". */
  chapterDefault: string;
  /** Editable content id for the chapter title. */
  titleEditId: string;
  /** Default chapter title text. */
  titleDefault: string;
  accent?: Accent;
}) {
  const rgb = ACCENT_RGB[accent];

  return (
    <div
      className="liquid-glass-3d liquid-glass-mobile group relative overflow-hidden rounded-[2.25rem] border border-white/15 px-6 py-9 sm:px-14 sm:py-12"
      style={{
        background:
          "linear-gradient(160deg, rgba(20,14,42,0.86), rgba(10,8,22,0.94))",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: `0 40px 120px -30px rgba(0,0,0,0.85), 0 0 90px -30px rgba(${rgb},0.45), inset 0 1px 0 rgba(255,255,255,0.07)`,
      }}
    >
      {/* Animated conic gradient ring */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[2.25rem] opacity-70"
        style={{
          padding: "1px",
          background: `conic-gradient(from 180deg at 50% 50%, rgba(${rgb},0.0), rgba(${rgb},0.65), rgba(255,255,255,0.18), rgba(${rgb},0.0))`,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {/* Top inner highlight — gel-cap "liquid glass" gloss. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />

      <ChapterPill
        editId={chapterEditId}
        defaultValue={chapterDefault}
        accent={accent}
        size="md"
      />

      <KineticText
        as="h2"
        text={titleDefault}
        editId={titleEditId}
        className="editorial-display relative mt-6 max-w-5xl text-balance text-white text-[clamp(2.1rem,6.4vw,5.2rem)] uppercase"
        style={{
          textShadow:
            "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
          letterSpacing: "-0.025em",
        }}
      />
    </div>
  );
}
