"use client";
import EditableText from "@/components/EditableText";

/**
 * HudEyebrow — monospace, technical chapter marker that replaces the
 * rounded ChapterPill on the Evade page. Same job (eyebrow above a
 * section heading) but reads as threat-console furniture instead of a
 * generic glass pill.
 *
 * IMPORTANT: it still renders an EditableText with the SAME editId and
 * the SAME defaultValue ChapterPill received, so every admin-editable
 * eyebrow stays editable and its stored value is unchanged. None of the
 * Evade eyebrow defaults begin with a leading "—", so this is byte-for-
 * byte equivalent to the value ChapterPill would have stored.
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

export default function HudEyebrow({
  editId,
  defaultValue,
  accent = "cyan",
  className = "",
}: {
  editId: string;
  defaultValue: string;
  accent?: keyof typeof RGB;
  className?: string;
}) {
  const rgb = RGB[accent] ?? RGB.cyan;
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span
        aria-hidden
        className="inline-block h-[2px] w-10 shrink-0 rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.95))` }}
      />
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 shrink-0 rotate-45"
        style={{ background: `rgba(${rgb},1)`, boxShadow: `0 0 12px rgba(${rgb},0.8)` }}
      />
      <EditableText
        id={editId}
        defaultValue={defaultValue}
        as="span"
        className="text-[11px] font-medium uppercase sm:text-xs"
        style={{
          fontFamily: MONO,
          letterSpacing: "0.3em",
          color: `rgba(${rgb},0.92)`,
        }}
      />
    </span>
  );
}
