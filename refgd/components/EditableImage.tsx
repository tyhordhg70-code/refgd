"use client";

/**
 * Inline-editable image with full admin controls.
 *
 * v6.13.14 — Major upgrade. Now stores FOUR content blocks per image
 * (the original `id` plus three derived keys), so admins can not only
 * swap the image but also apply an animation template, scale it, and
 * carve / add space below it. When wrapped in an <EditableImageGroup>,
 * the popover also exposes Move-Up / Move-Down buttons that reorder
 * the image within the group.
 *
 *   {id}        → src                          (string URL or data URL)
 *   {id}.anim   → animation template class     (e.g. "atpl-float")
 *   {id}.scale  → scale multiplier             (string float, "0.50".."2.00")
 *   {id}.mb     → margin below image in px     (string int, "-200".."400")
 *
 * Default mode: renders an `<img>` (we use `<img>` rather than next/image
 * because the URL is dynamic, can be a data URL, and we don't want to
 * pre-build a remote-pattern allowlist for every image an admin pastes).
 *
 * Edit mode: clicking opens a popover with all five controls. Every
 * change flows through the existing `setValue(id, …)` so undo / redo /
 * dirty tracking / Save (Publish) all work for these new keys exactly
 * like text edits.
 */

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useEditContext } from "@/lib/edit-context";
import { useEditableImageGroup } from "./EditableImageGroup";
import { ANIMATION_TEMPLATES } from "@/lib/image-presets";

type Props = {
  id: string;
  defaultSrc: string;
  alt: string;
  className?: string;
  /** Sizing wrapper class so the popover anchors correctly. */
  wrapperClassName?: string;
  /** Optional inline style for the wrapper (e.g. fixed sizing). */
  wrapperStyle?: CSSProperties;
};

export default function EditableImage({
  id,
  defaultSrc,
  alt,
  className = "",
  wrapperClassName = "inline-block",
  wrapperStyle,
}: Props) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const group = useEditableImageGroup();

  const src   = getValue(id, defaultSrc);
  const anim  = getValue(`${id}.anim`,  "");
  const scale = parseFloat(getValue(`${id}.scale`, "1") || "1");
  const mb    = parseInt(getValue(`${id}.mb`, "0") || "0", 10);

  const editing = isAdmin && editMode;

  const [popOpen, setPopOpen] = useState(false);
  const [draftSrc, setDraftSrc] = useState(src);
  const popRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraftSrc(src), [src]);

  // Click-outside dismiss
  useEffect(() => {
    if (!popOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setPopOpen(false);
      }
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [popOpen]);

  const applySrc = (next: string) => {
    if (next !== src) setValue(id, next);
    setPopOpen(false);
  };

  const onFile = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => applySrc(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  // Compose wrapper style: caller-supplied + scale + spacing + group order.
  const compoundStyle: CSSProperties = {
    ...wrapperStyle,
    ...(scale !== 1
      ? { transform: `scale(${scale})`, transformOrigin: "center" }
      : {}),
    ...(mb !== 0 ? { marginBottom: `${mb}px` } : {}),
    ...(group ? { order: group.indexOf(id) } : {}),
  };

  return (
    <span className={`relative ${wrapperClassName}`} style={compoundStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || defaultSrc}
        alt={alt}
        className={
          (anim ? `${anim} ` : "") +
          (editing
            ? `${className} cursor-pointer outline outline-2 outline-transparent transition-[outline-color] hover:outline-amber-300/80`
            : className)
        }
        data-editable-id={id}
        onClick={(e) => {
          if (!editing) return;
          e.preventDefault();
          e.stopPropagation();
          setPopOpen((o) => !o);
        }}
        draggable={false}
      />

      {editing && popOpen && (
        <div
          ref={popRef}
          className="absolute left-0 top-full z-[85] mt-2 w-[22rem] max-w-[92vw] space-y-3 rounded-xl border border-white/15 bg-ink-900/95 p-3 text-xs text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="text-[10px] uppercase tracking-widest text-white/45">
            Image · {id}
          </div>

          {/* ── 1. SRC swap ───────────────────────────────────────── */}
          <div className="space-y-2">
            <input
              value={draftSrc}
              onChange={(e) => setDraftSrc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySrc(draftSrc);
                if (e.key === "Escape") setPopOpen(false);
              }}
              placeholder="https://… or paste a data URL"
              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 outline-none focus:border-amber-300/60"
              spellCheck={false}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/80 hover:bg-white/10"
              >
                Upload file…
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => applySrc(draftSrc)}
                className="rounded-md bg-amber-400 px-3 py-1 font-semibold text-ink-950 hover:brightness-110"
              >
                Apply src
              </button>
            </div>
          </div>

          {/* ── 2. ANIMATION TEMPLATE ─────────────────────────────── */}
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-white/45">
              Animation template
            </span>
            <select
              value={anim}
              onChange={(e) => setValue(`${id}.anim`, e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 outline-none focus:border-amber-300/60"
            >
              <option value="">— None —</option>
              {ANIMATION_TEMPLATES.map((t) => (
                <option key={t.cls} value={t.cls}>{t.label}</option>
              ))}
            </select>
          </label>

          {/* ── 3. SCALE slider ───────────────────────────────────── */}
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-white/45">
              <span>Scale</span><span className="text-white/70">{scale.toFixed(2)}×</span>
            </span>
            <input
              type="range" min={0.5} max={2.0} step={0.05} value={scale}
              onChange={(e) => setValue(`${id}.scale`, e.target.value)}
              className="w-full accent-amber-400"
            />
          </label>

          {/* ── 4. SPACING slider (manual cut/add) ────────────────── */}
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-white/45">
              <span>Space below (px)</span><span className="text-white/70">{mb}</span>
            </span>
            <input
              type="range" min={-200} max={400} step={4} value={mb}
              onChange={(e) => setValue(`${id}.mb`, e.target.value)}
              className="w-full accent-amber-400"
            />
          </label>

          {/* ── 5. REORDER (only when inside an EditableImageGroup) ── */}
          {group && (
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
              <span className="text-white/65">
                Position: <span className="text-white/95">{group.indexOf(id) + 1} / {group.order.length}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => group.moveUp(id)}
                  disabled={group.indexOf(id) <= 0}
                  className="rounded-md border border-white/10 px-2 py-0.5 text-white/80 hover:bg-white/10 disabled:opacity-40"
                  aria-label="Move earlier"
                >↑</button>
                <button
                  type="button"
                  onClick={() => group.moveDown(id)}
                  disabled={group.indexOf(id) >= group.order.length - 1}
                  className="rounded-md border border-white/10 px-2 py-0.5 text-white/80 hover:bg-white/10 disabled:opacity-40"
                  aria-label="Move later"
                >↓</button>
              </div>
            </div>
          )}

          <div className="flex justify-between border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => {
                setValue(`${id}.anim`,  "");
                setValue(`${id}.scale`, "1");
                setValue(`${id}.mb`,    "0");
              }}
              className="text-white/55 hover:text-white"
            >
              Reset effects
            </button>
            <button
              type="button"
              onClick={() => setPopOpen(false)}
              className="text-white/85 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
