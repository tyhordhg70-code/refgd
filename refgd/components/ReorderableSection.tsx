"use client";

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
      next.splice(toIdx, 0, src);
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

export function ReorderableSection({ sectionId, children, className = "" }: SectionProps) {
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
        <div
          className="absolute left-2 top-2 z-[60] cursor-grab rounded-md border border-amber-300/40 bg-ink-900/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-200 shadow-md backdrop-blur-md hover:bg-ink-800"
          draggable
          onDragStart={(e) => {
            ctx.beginDrag(sectionId);
            try {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", sectionId);
            } catch {}
          }}
          onDragEnd={() => ctx.endDrag()}
          title="Drag to reorder section"
          aria-label="Drag to reorder section"
          data-testid={`reorder-handle-${sectionId}`}
        >
          ⋮⋮ {sectionId}
        </div>
      )}
      {children}
    </div>
  );
}
