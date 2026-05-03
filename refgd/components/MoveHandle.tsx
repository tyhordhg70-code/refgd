"use client";

/**
 * MoveHandle — drag-to-reposition affordance for editable elements.
 *
 * v6.13.43 — Two upgrades on top of v6.13.42:
 *   (1) COLLISION PUSH. While dragging, any other [data-move-target]
 *       element whose bounding rect intersects the dragged element
 *       is shoved out of the way along the smaller-overlap axis. The
 *       push offset stacks on top of that element's own persisted
 *       (dx, dy) and is committed on release, so siblings actually
 *       move out of the way instead of overlapping.
 *   (2) Z-INDEX bumped to z-[1000] so the handle stays above scaled
 *       images and stacking-context popovers.
 *
 * v6.13.42 — Original drag-to-reposition handle. Persists offsets as
 * `{id}.dx` / `{id}.dy` content keys and translates the live DOM
 * during drag for smooth motion.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useEditContext } from "@/lib/edit-context";

export function useMoveOffset(id: string): {
  dx: number;
  dy: number;
  transform: string | undefined;
} {
  const { getValue } = useEditContext();
  let dx = 0;
  let dy = 0;
  try {
    dx = parseFloat(getValue(`${id}.dx`, "0") || "0") || 0;
    dy = parseFloat(getValue(`${id}.dy`, "0") || "0") || 0;
  } catch {
    /* getValue may throw during a hot-reload boundary — treat as 0 */
  }
  return {
    dx,
    dy,
    transform:
      dx || dy ? `translate3d(${dx}px, ${dy}px, 0)` : undefined,
  };
}

type PushedRecord = {
  baseDx: number;
  baseDy: number;
  pushX: number;
  pushY: number;
  el: HTMLElement;
  origInline: string; // original style.transform string
};

export default function MoveHandle({
  id,
  className = "",
  positionClassName = "-right-2 -top-2",
}: {
  id: string;
  className?: string;
  positionClassName?: string;
}) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const editing = isAdmin && editMode;

  const startX = useRef(0);
  const startY = useRef(0);
  const startDx = useRef(0);
  const startDy = useRef(0);
  const draft = useRef<{ dx: number; dy: number } | null>(null);
  const pushedRef = useRef<Map<string, PushedRecord>>(new Map());
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
    const original = el.dataset.moveOriginalTransform;
    const stash =
      original !== undefined
        ? original
        : (el.dataset.moveOriginalTransform = el.style.transform || "");
    el.style.transform =
      `translate3d(${dx}px, ${dy}px, 0)` + (stash ? ` ${stash}` : "");
  };

  /** v6.13.43 — Push siblings out of the way of the dragged element. */
  const applyCollisionPush = () => {
    const dragEl = findTarget();
    if (!dragEl) return;
    const dragRect = dragEl.getBoundingClientRect();
    const all = document.querySelectorAll<HTMLElement>("[data-move-target]");
    const seen = new Set<string>();
    for (const other of Array.from(all)) {
      if (other === dragEl) continue;
      const otherId = other.getAttribute("data-move-target");
      if (!otherId || otherId === id) continue;
      seen.add(otherId);
      const r = other.getBoundingClientRect();
      const overlapX = Math.min(dragRect.right, r.right) - Math.max(dragRect.left, r.left);
      const overlapY = Math.min(dragRect.bottom, r.bottom) - Math.max(dragRect.top, r.top);
      if (overlapX <= 0 || overlapY <= 0) {
        // No overlap — release any prior push on this element.
        const prev = pushedRef.current.get(otherId);
        if (prev) {
          prev.el.style.transform = prev.origInline;
          pushedRef.current.delete(otherId);
        }
        continue;
      }
      // Determine push direction: smaller overlap axis, signed away from
      // the dragged element's centre.
      const dragCx = (dragRect.left + dragRect.right) / 2;
      const dragCy = (dragRect.top + dragRect.bottom) / 2;
      const otherCx = (r.left + r.right) / 2;
      const otherCy = (r.top + r.bottom) / 2;
      let pushX = 0;
      let pushY = 0;
      if (overlapX < overlapY) {
        pushX = (otherCx >= dragCx ? overlapX : -overlapX) + 8 * Math.sign(otherCx - dragCx || 1);
      } else {
        pushY = (otherCy >= dragCy ? overlapY : -overlapY) + 8 * Math.sign(otherCy - dragCy || 1);
      }
      // Stash original inline transform on first push so we can restore.
      const existing = pushedRef.current.get(otherId);
      let baseDx = 0;
      let baseDy = 0;
      let origInline = other.style.transform || "";
      if (existing) {
        baseDx = existing.baseDx;
        baseDy = existing.baseDy;
        origInline = existing.origInline;
      } else {
        try {
          baseDx = parseFloat(getValue(`${otherId}.dx`, "0") || "0") || 0;
          baseDy = parseFloat(getValue(`${otherId}.dy`, "0") || "0") || 0;
        } catch { /* ignore */ }
      }
      pushedRef.current.set(otherId, { baseDx, baseDy, pushX, pushY, el: other, origInline });
      // Apply combined translate: original (baseDx+pushX, baseDy+pushY)
      const tx = baseDx + pushX;
      const ty = baseDy + pushY;
      // Strip any prior translate3d() from origInline before composing.
      const cleanOrig = origInline.replace(/translate3d\([^)]*\)\s*/g, "").trim();
      other.style.transform =
        `translate3d(${tx}px, ${ty}px, 0)` + (cleanOrig ? ` ${cleanOrig}` : "");
    }
    // Release pushes on elements no longer overlapping.
    for (const [otherId, rec] of Array.from(pushedRef.current.entries())) {
      if (!seen.has(otherId)) {
        rec.el.style.transform = rec.origInline;
        pushedRef.current.delete(otherId);
      }
    }
  };

  const begin = (cx: number, cy: number) => {
    startX.current = cx;
    startY.current = cy;
    try {
      startDx.current = parseFloat(getValue(`${id}.dx`, "0") || "0") || 0;
      startDy.current = parseFloat(getValue(`${id}.dy`, "0") || "0") || 0;
    } catch {
      startDx.current = 0;
      startDy.current = 0;
    }
    draft.current = { dx: startDx.current, dy: startDy.current };
    pushedRef.current.clear();
    setDragging(true);
  };

  const move = (cx: number, cy: number) => {
    const dx = startDx.current + (cx - startX.current);
    const dy = startDy.current + (cy - startY.current);
    draft.current = { dx, dy };
    liveTranslate(dx, dy);
    try { applyCollisionPush(); } catch { /* never crash on push */ }
  };

  const end = () => {
    try {
      if (draft.current) {
        setValue(`${id}.dx`, String(Math.round(draft.current.dx)));
        setValue(`${id}.dy`, String(Math.round(draft.current.dy)));
      }
      // Persist pushed siblings — bake (baseDx + pushX) into their stored
      // dx/dy and clear the inline transform we wrote during the drag.
      for (const [otherId, rec] of Array.from(pushedRef.current.entries())) {
        const finalX = Math.round(rec.baseDx + rec.pushX);
        const finalY = Math.round(rec.baseDy + rec.pushY);
        setValue(`${otherId}.dx`, String(finalX));
        setValue(`${otherId}.dy`, String(finalY));
        rec.el.style.transform = rec.origInline;
      }
      pushedRef.current.clear();
      const el = findTarget();
      if (el) {
        delete el.dataset.moveOriginalTransform;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[move] commit error", err);
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
    try {
      setValue(`${id}.dx`, "0");
      setValue(`${id}.dy`, "0");
    } catch { /* ignore */ }
  };

  if (!editing) return null;

  return (
    <span
      className={`absolute z-[1000] flex items-center gap-1 ${positionClassName} ${className}`}
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
        title="Drag to reposition (siblings will move out of the way)"
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

function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

/* eslint-disable @typescript-eslint/no-unused-vars */
type _Unused = CSSProperties;
