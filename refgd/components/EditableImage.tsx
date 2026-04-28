"use client";

/**
 * Inline-editable image.
 *
 * Default mode: renders an `<img>` (we use `<img>` rather than next/image
 * because the URL is dynamic, can be a data URL, and we don't want to
 * pre-build a remote-pattern allowlist for every brand logo an admin pastes).
 *
 * Edit mode: clicking opens a small popover where the admin can either
 *   - paste an https:// URL, or
 *   - drop / pick a local file (we read it as a data URL and store inline)
 *
 * Both code paths flow through `setValue(id, src)` so undo/redo work.
 */

import { useEffect, useRef, useState } from "react";
import { useEditContext } from "@/lib/edit-context";

type Props = {
  id: string;
  defaultSrc: string;
  alt: string;
  className?: string;
  /** Optional sizing wrapper class so the popover anchors correctly. */
  wrapperClassName?: string;
};

export default function EditableImage({
  id,
  defaultSrc,
  alt,
  className = "",
  wrapperClassName = "inline-block",
}: Props) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const src = getValue(id, defaultSrc);
  const editing = isAdmin && editMode;

  const [popOpen, setPopOpen] = useState(false);
  const [draft, setDraft] = useState(src);
  const popRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(src), [src]);

  useEffect(() => {
    if (!popOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setPopOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [popOpen]);

  const apply = (next: string) => {
    if (next !== src) setValue(id, next);
    setPopOpen(false);
  };

  const onFile = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be under 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => apply(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  return (
    <span className={`relative ${wrapperClassName}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || defaultSrc}
        alt={alt}
        className={
          editing
            ? `${className} cursor-pointer outline outline-2 outline-transparent transition-[outline-color] hover:outline-amber-300/80`
            : className
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
          className="absolute left-0 top-full z-[85] mt-2 w-80 rounded-xl border border-white/15 bg-ink-900/95 p-3 text-xs shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-white/45">
            Image · {id}
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply(draft);
              if (e.key === "Escape") setPopOpen(false);
            }}
            placeholder="https://… or paste a data URL"
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-amber-300/60"
            autoFocus
            spellCheck={false}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPopOpen(false)}
                className="rounded-md px-2 py-1 text-white/55 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => apply(draft)}
                className="rounded-md bg-amber-400 px-3 py-1 font-semibold text-ink-950 hover:brightness-110"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
