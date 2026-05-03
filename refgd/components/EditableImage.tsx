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
import { createPortal } from "react-dom";
import type { CSSProperties, DragEvent as ReactDragEvent } from "react";
import { useEditContext } from "@/lib/edit-context";
import { useEditableImageGroup } from "./EditableImageGroup";
import { ANIMATION_TEMPLATES } from "@/lib/image-presets";
import MoveHandle, { useMoveOffset as useMoveOffsetEditable } from "@/components/MoveHandle";

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
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /* v6.13.43 — Anchor rect for the portal-rendered popover. We re-measure
     on open + on every scroll/resize so the popover follows the image
     even when the user scrolls the page mid-edit. */
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => setDraftSrc(src), [src]);

  // Click-outside dismiss + anchor tracking while popover is open.
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

  /* v6.13.41 — Scale is now applied to the IMG element, NOT to the
     outer wrapper.

     Old behaviour: `transform: scale(N)` was applied to the wrapper
     <span> that contains BOTH the image and the edit popover. Two
     consequences the user reported:
       (a) "Editing scale of image does not resize image" — true in a
           layout sense: CSS transforms don't reflow, so the wrapper
           still occupied its original bounding box and surrounding
           siblings didn't move out of the way. Visually the image
           appeared the same size relative to the (now-overlapping)
           neighbours.
       (b) "Breaks usability of the entire box to edit" — the popover
           is a child of the wrapper, so it inherited the same scale
           transform. At scale 0.5 the popover became unreadable; at
           scale 2.0 it overflowed the viewport and the file picker
           / Apply button were unreachable.

     New behaviour: the wrapper keeps spacing + group order only. The
     scale transform is applied directly to the <img>, with
     `transform-origin: center top` so the image grows DOWNWARD
     (instead of bleeding upward into the previous section) and the
     popover — which is anchored to the wrapper — always renders at
     1× and remains usable regardless of image scale. */
  /* v6.13.42 — Per-element drag-to-reposition. The persisted (dx,dy)
     from useMoveOffset is composed into the wrapper transform along
     with any caller-supplied transform, so admins can drag the whole
     image to a new spot via the MoveHandle rendered below. */
  const move = useMoveOffsetEditable(id);
  const wrapperTransform = move.transform;
  const compoundStyle: CSSProperties = {
    ...wrapperStyle,
    ...(wrapperTransform ? { transform: wrapperTransform } : {}),
    ...(mb !== 0 ? { marginBottom: `${mb}px` } : {}),
    ...(group ? { order: group.indexOf(id) } : {}),
  };

  const imgScaleStyle: CSSProperties =
    scale !== 1
      ? {
          transform: `scale(${scale})`,
          transformOrigin: "center top",
          // Reserve vertical room for the scaled image so the next
          // section actually moves down/up — transforms don't reflow,
          // but margin does. Negative scale (<1) pulls following
          // content up; >1 pushes it down. Approximate the visual
          // delta as (scale-1) × natural height, but since we don't
          // know the natural height ahead of time, fall back to a
          // best-effort using the rendered offsetHeight via CSS only
          // (`em` units would require a font ref). Leave the height
          // reserve responsibility to the admin's `Space below`
          // slider — already exposed via `mb` — and just document
          // the trade-off here.
        }
      : {};

  /* v6.13.35 — Drag-and-drop affordances. Two distinct behaviours
     are wired into the SAME wrapper element:

     (1) Internal sibling reorder (only when this image lives inside
         an <EditableImageGroup>). The wrapper becomes draggable in
         admin/edit mode; onDragStart/Over/Drop talk to the group
         context which mutates the persisted order array.

     (2) External file drop. Admins can drag an image file straight
         off their desktop onto ANY EditableImage to set that
         image's source — no need to open the popover and click
         "Upload file…". This works on every EditableImage, group
         or no group.

     Both share the same onDrop handler; we discriminate by checking
     `e.dataTransfer.types` — "Files" wins (user is dropping a real
     file from the OS), otherwise it's an internal sibling drag.
     `isDragOver` drives a visible amber ring so the admin gets
     unambiguous feedback about where the drop will land. */
  const [isDragOver, setIsDragOver] = useState(false);
  const draggable = editing && Boolean(group);
  const showOverRing = isDragOver || (group?.overId === id);

  const onWrapperDragStart = (e: ReactDragEvent) => {
    if (!draggable || !group) return;
    group.startDrag(id);
    // Required by Firefox to actually start a drag.
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onWrapperDragEnd = () => {
    if (group) group.endDrag();
    setIsDragOver(false);
  };
  const onWrapperDragOver = (e: ReactDragEvent) => {
    if (!editing) return;
    const types = Array.from(e.dataTransfer.types);
    const isFile = types.includes("Files");
    const isReorder = group && group.dragId && group.dragId !== id;
    if (!isFile && !isReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = isFile ? "copy" : "move";
    if (isReorder && group) group.hoverDrag(id);
    setIsDragOver(true);
  };
  const onWrapperDragLeave = () => setIsDragOver(false);
  const onWrapperDrop = (e: ReactDragEvent) => {
    if (!editing) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      onFile(file);
      return;
    }
    if (group && group.dragId && group.dragId !== id) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      group.dropOn(id);
    }
  };

  /* v6.13.43 — Compute portal popover position. Anchored just below the
     image; if it would overflow the right edge of the viewport we shift
     it left so it stays fully on-screen. Width fixed to 22rem (352px). */
  const POP_W = 352;
  const popLeft = anchorRect
    ? Math.max(8, Math.min(anchorRect.left, (typeof window !== "undefined" ? window.innerWidth : 1024) - POP_W - 8))
    : 0;
  const popTop = anchorRect ? anchorRect.bottom + 8 : 0;

  return (
    <span
      ref={wrapperRef}
      className={`relative ${wrapperClassName} ${
        editing
          ? "rounded-lg outline outline-2 outline-offset-2 transition-[outline-color,box-shadow] " +
            (showOverRing
              ? "outline-amber-300 [box-shadow:0_0_0_4px_rgba(245,185,69,0.18)]"
              : "outline-transparent")
          : ""
      }`}
      style={compoundStyle}
      data-move-target={id}
      draggable={draggable}
      onDragStart={onWrapperDragStart}
      onDragEnd={onWrapperDragEnd}
      onDragOver={onWrapperDragOver}
      onDragLeave={onWrapperDragLeave}
      onDrop={onWrapperDrop}
      title={
        editing
          ? group
            ? "Click to edit • Drag to reorder • Drop an image file to replace"
            : "Click to edit • Drop an image file to replace"
          : undefined
      }
    >
      {editing && <MoveHandle id={id} positionClassName="-right-3 -top-3" />}
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
        style={imgScaleStyle}
        data-editable-id={id}
        onClick={(e) => {
          if (!editing) return;
          e.preventDefault();
          e.stopPropagation();
          setPopOpen((o) => !o);
        }}
        draggable={false}
      />

      {editing && popOpen && anchorRect && typeof document !== "undefined" && createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", top: popTop, left: popLeft, width: POP_W, zIndex: 100000 }}
          className="space-y-3 rounded-xl border border-white/15 bg-ink-900/98 p-3 text-xs text-white shadow-2xl backdrop-blur-xl"
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
              <option value="" className="bg-ink-900 text-white">— None —</option>
              {ANIMATION_TEMPLATES.map((t) => (
                <option key={t.cls} value={t.cls} className="bg-ink-900 text-white">{t.label}</option>
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
        </div>,
        document.body
      )}
    </span>
  );
}
