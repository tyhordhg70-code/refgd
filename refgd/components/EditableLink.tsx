"use client";

/**
 * Inline-editable anchor.
 *
 * Default mode: renders a normal `<a>` (or any element via `as`) with the
 * resolved label as its child. Clicking navigates as usual.
 *
 * Edit mode: clicking opens a tiny inline popover that lets the admin
 * edit the URL (`idHref`) and label (`idLabel`, optional). Both flow
 * through the EditContext so they're undoable and persisted on Publish.
 *
 * The label can also be edited inline via `<EditableText>`-style
 * contentEditable when `idLabel` is provided AND `inlineLabel` is true —
 * useful for buttons whose label is part of the visual hierarchy.
 */

import { useEffect, useRef, useState } from "react";
import { useEditContext } from "@/lib/edit-context";

type Props = {
  /** Content id holding the URL (e.g. "hero.cta.url"). */
  idHref: string;
  defaultHref: string;
  /** Optional content id for the visible label. */
  idLabel?: string;
  defaultLabel?: string;
  /** Label rendered if `idLabel`/`defaultLabel` are not provided. */
  children?: React.ReactNode;
  className?: string;
  /** Adds `target="_blank"` + `rel="noopener noreferrer"`. */
  external?: boolean;
  /** When true (default), label is contentEditable inside the anchor. */
  inlineLabel?: boolean;
  /** Pass-through aria/data attributes. */
  ariaLabel?: string;
  dataAttrs?: Record<string, string>;
};

export default function EditableLink({
  idHref,
  defaultHref,
  idLabel,
  defaultLabel,
  children,
  className = "",
  external,
  inlineLabel = true,
  ariaLabel,
  dataAttrs,
}: Props) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const href = getValue(idHref, defaultHref);
  const label = idLabel ? getValue(idLabel, defaultLabel ?? "") : (defaultLabel ?? "");
  const editing = isAdmin && editMode;

  const [popOpen, setPopOpen] = useState(false);
  const [draftHref, setDraftHref] = useState(href);
  const popRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => setDraftHref(href), [href]);

  // Click-outside closes the popover.
  useEffect(() => {
    if (!popOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setPopOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [popOpen]);

  // Keep label DOM in sync with value when not focused (for undo / discard).
  useEffect(() => {
    if (!idLabel) return;
    const el = labelRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== label) el.textContent = label;
  }, [label, idLabel]);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!editing) return;
    // In edit mode, never navigate. Plain click does nothing; alt-click
    // opens the URL editor. The little ✎ badge also opens it.
    e.preventDefault();
    if (e.altKey) setPopOpen(true);
  };

  const onLabelBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (!idLabel) return;
    const next = (e.currentTarget.textContent ?? "").replace(/\u00A0/g, " ");
    if (next !== label) setValue(idLabel, next);
  };

  const onLabelKey = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (labelRef.current) labelRef.current.textContent = label;
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const commitHref = () => {
    if (draftHref !== href) setValue(idHref, draftHref);
    setPopOpen(false);
  };

  const linkClass = editing
    ? `relative cursor-text rounded-sm ring-1 ring-amber-300/0 hover:ring-amber-300/60 ${className}`
    : className;

  const labelEditable = editing && idLabel && inlineLabel;

  const content =
    labelEditable ? (
      <span
        ref={labelRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onBlur={onLabelBlur}
        onKeyDown={onLabelKey}
        className="outline-none"
        data-editable-id={idLabel}
      >
        {label}
      </span>
    ) : idLabel ? (
      label
    ) : (
      children ?? defaultLabel
    );

  return (
    <span className="relative inline-flex items-center">
      <a
        href={href || "#"}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={linkClass}
        onClick={onClick}
        aria-label={ariaLabel}
        {...(dataAttrs ?? {})}
      >
        {content}
      </a>
      {editing && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPopOpen(true);
          }}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/10 text-[10px] text-amber-200 hover:bg-amber-400/30"
          title={`Edit URL (${idHref})`}
          aria-label="Edit link URL"
        >
          🔗
        </button>
      )}
      {editing && popOpen && (
        <div
          ref={popRef}
          className="absolute left-0 top-full z-[85] mt-2 w-72 rounded-xl border border-white/15 bg-ink-900/95 p-3 text-xs shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-white/45">
            URL · {idHref}
          </div>
          <input
            value={draftHref}
            onChange={(e) => setDraftHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitHref();
              if (e.key === "Escape") setPopOpen(false);
            }}
            placeholder="https://…"
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-amber-300/60"
            autoFocus
            spellCheck={false}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPopOpen(false)}
              className="rounded-md px-2 py-1 text-white/55 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitHref}
              className="rounded-md bg-amber-400 px-3 py-1 font-semibold text-ink-950 hover:brightness-110"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
