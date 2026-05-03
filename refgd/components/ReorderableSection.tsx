"use client";
import EditorIsland from "@/components/EditorIsland";

/**
 * Drag-to-reorder wrapper for top-level page sections.
 *
 * Usage on a page:
 *   <ReorderableContainer pageId="evade-cancelations">
 *     <ReorderableSection sectionId="hero">…</ReorderableSection>
 *     <ReorderableSection sectionId="intro">…</ReorderableSection>
 *     …
 *   </ReorderableContainer>
 *
 * The container reads/writes the order under the existing
 * `content_blocks` row id `_section_order_<pageId>` (a JSON array of
 * `sectionId`s). Persistence reuses `setValue(...)` from the
 * EditContext and is therefore part of the normal Save/Discard cycle.
 *
 * Reordering is admin + edit-mode only. Non-admins always see the
 * sections in the saved order (or the original prop order if no order
 * has been published yet).
 *
 * Implementation:
 *   - Container caches the ordered list of children sectionIds.
 *   - In edit mode, a small drag handle floats over each section's
 *     top-left corner. Native HTML5 D&D handles the move; the
 *     container re-renders the children in the new order.
 */
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { useEditContext } from "@/lib/edit-context";

const ORDER_PREFIX = "_section_order_";

type ContainerCtx = {
  pageId: string;
  isReordering: boolean;
  beginDrag: (sectionId: string) => void;
  endDrag: () => void;
  dropOn: (targetId: string) => void;
};
const Ctx = createContext<ContainerCtx | null>(null);

type ContainerProps = {
  /** Stable key per page route (e.g. "store-list"). */
  pageId: string;
  children: ReactNode;
};

export function ReorderableContainer({ pageId, children }: ContainerProps) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const orderKey = `${ORDER_PREFIX}${pageId}`;
  // Initial child IDs = order they appear in source.
  const initialIds = useMemo(() => {
    const ids: string[] = [];
    Children.forEach(children, (c) => {
      if (
        isValidElement(c) &&
        typeof (c.props as { sectionId?: string }).sectionId === "string"
      ) {
        ids.push((c.props as { sectionId: string }).sectionId);
      }
    });
    return ids;
  }, [children]);

  // Saved order from EditContext (default = source order).
  const savedOrderRaw = getValue(orderKey, JSON.stringify(initialIds));
  const savedOrder = useMemo<string[]>(() => {
    try {
      const arr = JSON.parse(savedOrderRaw);
      if (!Array.isArray(arr)) return initialIds;
      // Drop ids no longer present, append any new ids at the end.
      const known = new Set(initialIds);
      const filtered = arr.filter((id: unknown) => typeof id === "string" && known.has(id));
      const seen = new Set(filtered);
      for (const id of initialIds) if (!seen.has(id)) filtered.push(id);
      return filtered;
    } catch {
      return initialIds;
    }
  }, [savedOrderRaw, initialIds]);

  const dragId = useRef<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const beginDrag = useCallback((id: string) => {
    dragId.current = id;
    setIsReordering(true);
  }, []);
  const endDrag = useCallback(() => {
    dragId.current = null;
    setIsReordering(false);
  }, []);
  const dropOn = useCallback(
    (target: string) => {
      const src = dragId.current;
      dragId.current = null;
      setIsReordering(false);
      if (!src || src === target) return;
      const next = [...savedOrder];
      const fromIdx = next.indexOf(src);
      const toIdx = next.indexOf(target);
      if (fromIdx < 0 || toIdx < 0) return;
      next.splice(fromIdx, 1);
      // After removing the source, every index ≥ fromIdx shifts down by
      // one. If the user dragged downward (fromIdx < toIdx) we have to
      // compensate so the dropped item lands AT the target's original
      // visual position rather than one slot past it.
      const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
      next.splice(insertIdx, 0, src);
      setValue(orderKey, JSON.stringify(next));
    },
    [savedOrder, orderKey, setValue],
  );

  // Reorder children to match savedOrder.
  const childrenById = useMemo(() => {
    const map = new Map<string, ReactElement>();
    Children.forEach(children, (c) => {
      if (
        isValidElement(c) &&
        typeof (c.props as { sectionId?: string }).sectionId === "string"
      ) {
        map.set((c.props as { sectionId: string }).sectionId, c);
      }
    });
    return map;
  }, [children]);

  const ordered: ReactNode[] = [];
  for (const id of savedOrder) {
    const c = childrenById.get(id);
    if (c) ordered.push(c);
  }
  // Anything that's not a ReorderableSection (raw text / wrappers)
  // tacks on at the end; the container only reorders our wrapper.
  Children.forEach(children, (c) => {
    if (
      !isValidElement(c) ||
      typeof (c.props as { sectionId?: string }).sectionId !== "string"
    ) {
      ordered.push(c);
    }
  });

  // Hide all reorder UI on non-admin / non-edit-mode views.
  const ctxValue: ContainerCtx = {
    pageId,
    isReordering: isAdmin && editMode && isReordering,
    beginDrag,
    endDrag,
    dropOn,
  };

  return <Ctx.Provider value={ctxValue}>{ordered}</Ctx.Provider>;
}

type SectionProps = {
  sectionId: string;
  children: ReactNode;
  /** Optional className applied to the wrapper div. */
  className?: string;
};

function ReorderableSectionInner({ sectionId, children, className = "" }: SectionProps) {
  const ctx = useContext(Ctx);
  const { isAdmin, editMode } = useEditContext();
  const showHandle = isAdmin && editMode && ctx;

  if (!ctx) {
    // No container — render plain.
    return <div className={className} data-section-id={sectionId}>{children}</div>;
  }

  return (
    <div
      data-section-id={sectionId}
      data-editable-skip="true"
      className={`relative ${className} ${
        showHandle ? "ring-1 ring-amber-300/0 hover:ring-amber-300/40 rounded-md transition" : ""
      }`}
      onDragOver={
        showHandle
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          : undefined
      }
      onDrop={
        showHandle
          ? (e) => {
              e.preventDefault();
              ctx.dropOn(sectionId);
            }
          : undefined
      }
    >
      {showHandle && (
        <ReorderHandle ctx={ctx} sectionId={sectionId} />
      )}
      {children}
    </div>
  );
}

/**
 * v6.13.40 — Standalone drag handle with FULL touch support.
 *
 * Root cause of the user's repeated "drag-drop still doesn't work"
 * report: the previous handle relied solely on HTML5 drag events
 * (`draggable` attribute + `onDragStart`/`onDragEnd`). On iPad / iOS
 * Safari and many touch laptops, HTML5 drag-and-drop is either
 * disabled or requires unusual long-press gestures, so the handle
 * was effectively unusable on the devices the admin actually edits
 * from.
 *
 * This rewritten handle supports BOTH input modes:
 *   • Mouse / desktop: native HTML5 D&D, same as before.
 *   • Touch: onTouchStart/Move/End drives a manual position-tracking
 *     loop. The handle floats with the finger; on release we
 *     elementsFromPoint() at the final coords and walk up to the
 *     nearest `[data-section-id]` to figure out the drop target,
 *     then dispatch ctx.dropOn(targetId).
 *
 * The handle is also LARGER, brighter, and labelled "≡ MOVE" so it's
 * unambiguously a drag affordance — the previous "⋮⋮ sectionId" text
 * was easily mistaken for a debug label.
 */
function ReorderHandle({
  ctx,
  sectionId,
}: {
  ctx: ContainerCtx;
  sectionId: string;
}) {
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dragging = useRef(false);

  const findTargetAt = (x: number, y: number): string | null => {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      const node = (el as HTMLElement).closest(
        "[data-section-id]",
      ) as HTMLElement | null;
      if (node) {
        const id = node.getAttribute("data-section-id");
        if (id && id !== sectionId) return id;
      }
    }
    return null;
  };

  return (
    <div
      className={`absolute left-2 top-2 z-[60] cursor-grab select-none rounded-lg border-2 border-amber-300/70 bg-ink-900/95 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-200 shadow-[0_8px_20px_-4px_rgba(245,185,69,0.45)] backdrop-blur-md transition active:cursor-grabbing active:scale-95 ${
        touchPos ? "ring-2 ring-amber-300" : "hover:bg-ink-800 hover:text-white"
      }`}
      draggable
      onDragStart={(e) => {
        ctx.beginDrag(sectionId);
        try {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", sectionId);
        } catch {}
      }}
      onDragEnd={() => ctx.endDrag()}
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        dragging.current = true;
        ctx.beginDrag(sectionId);
        const t = e.touches[0];
        setTouchPos({ x: t.clientX, y: t.clientY });
      }}
      onTouchMove={(e) => {
        if (!dragging.current || e.touches.length !== 1) return;
        // Prevent body scroll while dragging.
        if (e.cancelable) e.preventDefault();
        const t = e.touches[0];
        setTouchPos({ x: t.clientX, y: t.clientY });
      }}
      onTouchEnd={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        const t = e.changedTouches[0];
        const targetId = t ? findTargetAt(t.clientX, t.clientY) : null;
        setTouchPos(null);
        if (targetId) ctx.dropOn(targetId);
        else ctx.endDrag();
      }}
      onTouchCancel={() => {
        dragging.current = false;
        setTouchPos(null);
        ctx.endDrag();
      }}
      style={
        touchPos
          ? {
              position: "fixed",
              left: touchPos.x - 40,
              top: touchPos.y - 18,
              zIndex: 9999,
              pointerEvents: "none",
            }
          : undefined
      }
      title={`Drag to reorder · ${sectionId}`}
      aria-label="Drag to reorder section"
      data-testid={`reorder-handle-${sectionId}`}
    >
      ≡ MOVE
    </div>
  );
}

export function ReorderableSection(props: SectionProps) {
  return (
    <EditorIsland id={props.sectionId}>
      <ReorderableSectionInner {...props} />
    </EditorIsland>
  );
}
