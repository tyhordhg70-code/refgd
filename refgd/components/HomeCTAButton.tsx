"use client";

/**
 * Home Telegram CTA — wraps MagneticButton so its href + label come from
 * the EditContext when the admin is editing, preserving the magnetic
 * hover physics in normal browsing mode.
 *
 * In default mode the button is a normal magnetic anchor that opens the
 * Telegram link in a new tab. In edit mode the URL is editable through
 * a tiny popover (🔗 badge), and the label itself is contentEditable.
 */

import { useEffect, useRef, useState } from "react";
import MagneticButton from "./MagneticButton";
import { useEditContext } from "@/lib/edit-context";

export default function HomeCTAButton({
  defaultUrl,
  defaultLabel,
}: {
  defaultUrl: string;
  defaultLabel: string;
}) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const url = getValue("hero.cta.url", defaultUrl);
  const label = getValue("hero.cta.label", defaultLabel);
  const editing = isAdmin && editMode;

  const [popOpen, setPopOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState(url);
  const popRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => setDraftUrl(url), [url]);

  useEffect(() => {
    if (!popOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setPopOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [popOpen]);

  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== label) el.textContent = label;
  }, [label]);

  const onLabelBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    const next = (e.currentTarget.textContent ?? "").replace(/\u00A0/g, " ");
    if (next !== label) setValue("hero.cta.label", next);
  };

  const commitUrl = () => {
    if (draftUrl !== url) setValue("hero.cta.url", draftUrl);
    setPopOpen(false);
  };

  return (
    <span className="relative inline-flex items-center">
      <MagneticButton
        href={editing ? "#" : url}
        external={!editing}
        variant="primary"
        pull={editing ? 0 : 0.5}
        data-testid="home-telegram-cta-link"
      >
        {editing ? (
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
            className="outline-none ring-1 ring-amber-300/0 focus:ring-amber-300"
            data-testid="home-telegram-cta-label-editor"
          >
            {label}
          </span>
        ) : (
          <span
            ref={labelRef}
            suppressHydrationWarning
            style={{ caretColor: "transparent" }}
            data-testid="home-telegram-cta-label"
          >
            {label}
          </span>
        )}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="m12 19 7-7-7-7" />
          <path d="M5 12h14" />
        </svg>
      </MagneticButton>
      {editing && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPopOpen(true);
          }}
          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/50 bg-amber-400/15 text-xs text-amber-200 hover:bg-amber-400/30"
          title="Edit CTA URL"
          aria-label="Edit CTA URL"
          data-testid="home-telegram-cta-edit-url-button"
        >
          🔗
        </button>
      )}
      {editing && popOpen && (
        <div
          ref={popRef}
          className="absolute right-0 top-full z-[85] mt-2 w-80 rounded-xl border border-white/15 bg-ink-900/95 p-3 text-xs shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-white/45">
            URL · hero.cta.url
          </div>
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitUrl();
              if (e.key === "Escape") setPopOpen(false);
            }}
            placeholder="https://…"
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-amber-300/60"
            autoFocus
            spellCheck={false}
            data-testid="home-telegram-cta-url-input"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPopOpen(false)}
              className="rounded-md px-2 py-1 text-white/55 hover:text-white"
            data-testid="home-telegram-cta-url-cancel-button"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitUrl}
              className="rounded-md bg-amber-400 px-3 py-1 font-semibold text-ink-950 hover:brightness-110"
            data-testid="home-telegram-cta-url-apply-button"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
