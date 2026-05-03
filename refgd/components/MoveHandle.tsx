"use client";

/**
 * MoveHandle — drag-to-reposition affordance for editable elements.
 *
 * v6.13.42 — Admins repeatedly reported "still can't drag-drop text /
 * images" because the existing reorder primitives only worked at the
 * SECTION level (ReorderableSection) or inside an EditableImageGroup,
 * neither of which let an admin nudge an INDIVIDUAL text or image to
 * a slightly different spot on the page.
 *
 * This component adds a per-element drag handle that, in admin edit
 * mode, lets the admin grab any EditableText / EditableImage and drag
 * it freely with mouse OR touch. The drag offset is persisted as two
 * content keys:
 *   {id}.dx  → horizontal offset in pixels
 *   {id}.dy  → vertical   offset in pixels
 *
 * The owning element renders the offset via `useMoveOffset(id)` which
 * returns a CSS `translate3d(...)` string. While the user is actively
 * dragging we bypass React and write the transform directly to the
 * DOM for buttery-smooth motion; on release we commit through the
 * EditContext so the value persists and survives reloads.
 *
 * The handle is INVISIBLE outside of edit mode and never affects
 * layout in production. In edit mode it sits at the top-right corner
 * of the element and is revealed on hover (or always-visible while
 * the admin is mid-drag).
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useEditContext } from "@/lib/edit-context";

/**
 * Read the persisted (dx, dy) offset for `id` and convert to a CSS
 * transform string the caller can splice into its own style object.
 *
 * Returns `transform: undefined` (not "none") when there is no
 * offset, so the caller can spread the style without overriding any
 * other transform-producing CSS class on the element.
 */
export function useMoveOffset(id: string): {
  dx: number;
  dy: number;
  /** CSS `translate3d(...)` or `undefined`. Splice into element style. */
  transform: string | undefined;
} {
  const { getValue } = useEditContext();
  const dx = parseFloat(getValue(`${id}.dx`, "0") || "0") || 0;
  const dy = parseFloat(getValue(`${id}.dy`, "0") || "0") || 0;
  return {
    dx,
    dy,
    transform:
      dx || dy ? `translate3d(${dx}px, ${dy}px, 0)` : undefined,
  };
}

/**
 * Drag handle button. Render as a child of a `position: relative`
 * parent that ALSO carries `data-editable-id="${id}"` so the handle
 * can find its target during a drag.
 *
 * Pass `targetSelector` to override target lookup (defaults to
 * `[data-editable-id="${id}"]`). Useful when the editable target is
 * nested deeper than the wrapper.
 */
export default function MoveHandle({
  id,
  className = "",
  positionClassName = "-right-2 -top-2",
}: {
  id: string;
  className?: string;
  /** Tailwind position classes for the handle within the wrapper. */
  positionClassName?: string;
}) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const editing = isAdmin && editMode;

  const startX = useRef(0);
  const startY = useRef(0);
  const startDx = useRef(0);
  const startDy = useRef(0);
  const draft = useRef<{ dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const findTarget = (): HTMLElement | null => {
    try {
      return document.querySelector<HTMLElement>(
        `[data-move-target="${cssEscape(id)}"]`,
      );
    } catch {
      return null;
    }
  };

  const liveTranslate = (dx: number, dy: number) => {
    const el = findTarget();
    if (!el) return;
    // Preserve any existing transform (e.g. scale on a scaled image)
    // by stashing the original on first drag and re-prepending it.
    const original = el.dataset.moveOriginalTransform;
    const stash =
      original !== undefined
        ? original
        : (el.dataset.moveOriginalTransform = el.style.transform || "");
    el.style.transform =
      `translate3d(${dx}px, ${dy}px, 0)` + (stash ? ` ${stash}` : "");
  };

  const begin = (cx: number, cy: number) => {
    startX.current = cx;
    startY.current = cy;
    startDx.current =
      parseFloat(getValue(`${id}.dx`, "0") || "0") || 0;
    startDy.current =
      parseFloat(getValue(`${id}.dy`, "0") || "0") || 0;
    draft.current = { dx: startDx.current, dy: startDy.current };
    setDragging(true);
  };

  const move = (cx: number, cy: number) => {
    const dx = startDx.current + (cx - startX.current);
    const dy = startDy.current + (cy - startY.current);
    draft.current = { dx, dy };
    liveTranslate(dx, dy);
  };

  const end = () => {
    if (draft.current) {
      setValue(`${id}.dx`, String(Math.round(draft.current.dx)));
      setValue(`${id}.dy`, String(Math.round(draft.current.dy)));
    }
    // Clear the inline-style override so React re-takes control
    // and applies the persisted dx/dy via the element's normal
    // style prop on the next render.
    const el = findTarget();
    if (el) {
      delete el.dataset.moveOriginalTransform;
    }
    draft.current = null;
    setDragging(false);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onUp = () => end();
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (e.cancelable) e.preventDefault();
      move(t.clientX, t.clientY);
    };
    const onTouchEnd = () => end();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const reset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setValue(`${id}.dx`, "0");
    setValue(`${id}.dy`, "0");
  };

  if (!editing) return null;

  return (
    <span
      className={`absolute z-[80] flex items-center gap-1 ${positionClassName} ${className}`}
      // Block clicks from reaching the underlying contentEditable.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`select-none rounded-full border-2 border-amber-300/80 bg-ink-900/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-200 shadow-lg backdrop-blur-md transition active:scale-95 ${
          dragging
            ? "ring-2 ring-amber-300 cursor-grabbing"
            : "cursor-grab opacity-70 hover:opacity-100 hover:bg-ink-800"
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          begin(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          e.stopPropagation();
          begin(t.clientX, t.clientY);
        }}
        title="Drag to reposition"
        aria-label="Drag to reposition"
        data-testid={`move-handle-${id}`}
      >
        ✥ MOVE
      </button>
      <button
        type="button"
        onClick={reset}
        className="select-none rounded-full border border-white/20 bg-ink-900/85 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/70 shadow hover:bg-ink-800 hover:text-white"
        title="Reset position"
        aria-label="Reset position"
      >
        ↺
      </button>
    </span>
  );
}

/** Minimal CSS.escape polyfill for older browsers (still needed on
 *  some Safari versions for content-key ids that contain dots). */
function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

/* eslint-disable @typescript-eslint/no-unused-vars */
type _Unused = CSSProperties;
