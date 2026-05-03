"use client";

/**
 * EditableMagneticButton — a MagneticButton whose label TEXT and href URL
 * are editable inline by an admin.
 *
 * v6.13.51 — REWRITE of edit mode. Previous version kept the
 * MagneticButton (and therefore an `<a href="#">`) wrapping the
 * contentEditable label. Even with `e.stopPropagation()` on the
 * span, clicking inside the label still triggered the anchor's
 * default action (anchors fire their default on click regardless of
 * descendant `stopPropagation` — preventDefault would have to be
 * called on the click event itself). The result: every click in the
 * label scrolled the page to top (`href="#"`), tore focus away from
 * the contentEditable, and admins reported "can't edit text of
 * Browse store list and Submit order button".
 *
 * Fix: in edit mode we no longer mount MagneticButton at all. We
 * render a visually-identical static button (same primary/ghost/
 * outline classes, same shape, same icon slot) using a plain `<div>`
 * so there is NO anchor and NO magnetic motion to fight focus. The
 * contentEditable label and the URL-edit pill work normally.
 *
 * View mode (non-admin or edit mode off) is unchanged: the real
 * MagneticButton renders, the anchor navigates, and the magnetic
 * cursor pull and aura still feel native.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import MagneticButton from "./MagneticButton";
import { useEditContext } from "@/lib/edit-context";

type Variant = "primary" | "ghost" | "outline";

const STATIC_BASE =
  "group relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold tracking-wide transition will-change-transform";
const STATIC_VARIANT: Record<Variant, string> = {
  primary:
    "text-ink-950 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_18px_60px_-15px_rgba(245,185,69,0.7)]",
  ghost:
    "border border-white/15 bg-white/5 text-white/90 backdrop-blur-md",
  outline:
    "border border-amber-300/50 bg-transparent text-amber-100",
};

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

  // Portal popover position — viewport-clamped, responsive width.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const POP_W = Math.min(320, Math.max(220, vw - 32));
  const popLeft = anchorRect
    ? Math.max(8, Math.min(anchorRect.left, vw - POP_W - 8))
    : 0;
  const popTop = anchorRect ? anchorRect.bottom + 8 : 0;

  // ─────────────────── VIEW MODE ───────────────────
  // Non-admin or edit-mode-off → real MagneticButton. Behaviour
  // identical to the original CTA: magnetic pull, aura, navigation.
  if (!editing) {
    return (
      <MagneticButton
        href={url}
        external={external}
        variant={variant}
        data-testid={testId}
      >
        <span>{label}</span>
        {icon}
      </MagneticButton>
    );
  }

  // ─────────────────── EDIT MODE ───────────────────
  // No anchor, no magnetic motion. Label is a contentEditable span,
  // a 🔗 pill on the right opens a URL edit popover (portal-rendered).
  return (
    <span ref={wrapperRef} className="relative inline-flex items-center">
      <div
        className={`${STATIC_BASE} ${STATIC_VARIANT[variant]}`}
        data-testid={testId}
      >
        <span className="relative z-10 flex items-center gap-2">
          <span
            ref={labelRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onBlur={onLabelBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLElement).blur();
              }
            }}
            className="caret-amber-500 outline-none ring-1 ring-amber-300/0 focus:ring-amber-300 px-1 rounded"
            data-testid={testId ? `${testId}-label-editor` : undefined}
          >
            {label}
          </span>
          {icon}
        </span>
      </div>
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
      {popOpen && anchorRect && typeof document !== "undefined" && createPortal(
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
