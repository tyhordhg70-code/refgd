"use client";

/**
 * EditableMagneticButton — a MagneticButton whose label TEXT and href URL
 * are editable inline by an admin. Mirrors the pattern in HomeCTAButton
 * (which is bound to a single hard-coded `hero.cta.*` content key) but
 * accepts arbitrary content key prefixes so it can be reused anywhere
 * a CTA needs admin editing of both copy and destination.
 *
 * Behaviour:
 *  • View mode: ordinary MagneticButton anchor — opens `urlKey` value
 *    in a new tab (when `external`) and shows `labelKey` value as
 *    children, plus the optional `icon` element to the right.
 *  • Edit mode: clicking the magnetic button does NOT navigate. The
 *    label becomes contentEditable, and a small 🔗 pill appears on
 *    the right that opens a portal-rendered URL popover (z-100000,
 *    fixed positioning, so it can never be clipped by the section's
 *    overflow / contain clip — same fix as the EditableImage popover
 *    in v6.13.43-44).
 *
 * Used on /our-service and /store-list "Browse the store list" and
 * "Submit your order" CTAs.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import MagneticButton from "./MagneticButton";
import { useEditContext } from "@/lib/edit-context";

type Variant = "primary" | "ghost" | "outline";

export default function EditableMagneticButton({
  labelKey,
  defaultLabel,
  urlKey,
  defaultUrl,
  external = true,
  variant = "primary",
  icon,
  testId,
}: {
  labelKey: string;
  defaultLabel: string;
  urlKey: string;
  defaultUrl: string;
  external?: boolean;
  variant?: Variant;
  icon?: ReactNode;
  testId?: string;
}) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const url = getValue(urlKey, defaultUrl);
  const label = getValue(labelKey, defaultLabel);
  const editing = isAdmin && editMode;

  const [popOpen, setPopOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState(url);
  const popRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => setDraftUrl(url), [url]);

  // Re-sync the contentEditable label content on remote changes only
  // (i.e. while we don't have focus there).
  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== label) el.textContent = label;
  }, [label]);

  // Click-outside dismiss + anchor tracking for the URL popover.
  useEffect(() => {
    if (!popOpen) return;
    const measure = () => {
      const r = wrapperRef.current?.getBoundingClientRect();
      if (r) setAnchorRect(r);
    };
    measure();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current && popRef.current.contains(t)) return;
      if (wrapperRef.current && wrapperRef.current.contains(t)) return;
      setPopOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [popOpen]);

  const onLabelBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    const next = (e.currentTarget.textContent ?? "").replace(/\u00A0/g, " ");
    if (next !== label) setValue(labelKey, next);
  };

  const commitUrl = () => {
    if (draftUrl !== url) setValue(urlKey, draftUrl);
    setPopOpen(false);
  };

  // Portal popover position — below the button, viewport-clamped.
  const POP_W = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const popLeft = anchorRect
    ? Math.max(8, Math.min(anchorRect.left, vw - POP_W - 8))
    : 0;
  const popTop = anchorRect ? anchorRect.bottom + 8 : 0;

  return (
    <span ref={wrapperRef} className="relative inline-flex items-center">
      <MagneticButton
        href={editing ? "#" : url}
        external={!editing && external}
        variant={variant}
        pull={editing ? 0 : 0.5}
        data-testid={testId}
      >
        {editing ? (
          <span
            ref={labelRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onBlur={onLabelBlur}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLElement).blur();
              }
            }}
            className="caret-amber-500 outline-none ring-1 ring-amber-300/0 focus:ring-amber-300"
            data-testid={testId ? `${testId}-label-editor` : undefined}
          >
            {label}
          </span>
        ) : (
          <span>{label}</span>
        )}
        {icon}
      </MagneticButton>
      {editing && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPopOpen((o) => !o);
          }}
          className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/60 bg-ink-900/80 text-[12px] text-amber-200 shadow-md backdrop-blur-md hover:bg-ink-800"
          title="Edit URL"
          aria-label="Edit URL"
          data-testid={testId ? `${testId}-url-edit` : undefined}
        >
          🔗
        </button>
      )}
      {editing && popOpen && anchorRect && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", top: popTop, left: popLeft, width: POP_W, zIndex: 100000 }}
          className="rounded-xl border border-white/15 bg-ink-900/98 p-3 text-xs shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-white/45">
            URL · {urlKey}
          </div>
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitUrl();
              if (e.key === "Escape") setPopOpen(false);
            }}
            placeholder="https://…"
            className="w-full rounded-md border border-white/10 bg-white/10 px-2 py-1.5 text-white caret-amber-300 outline-none placeholder:text-white/40 focus:border-amber-300/60 focus:bg-white/15"
            autoFocus
            spellCheck={false}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPopOpen(false)}
              className="rounded-md border border-white/10 px-2 py-1 text-white/75 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitUrl}
              className="rounded-md bg-amber-400 px-3 py-1 font-semibold text-ink-950 hover:brightness-110"
            >
              Save URL
            </button>
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}
