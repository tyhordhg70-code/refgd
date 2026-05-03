"use client";

/**
 * EditableImageGroup — admin can rearrange the visual order of a set
 * of <EditableImage> children via UP/DOWN buttons that appear inside
 * each child's edit popover. The chosen order persists as a JSON
 * array under content id `imagegroup.{id}.order` (the children's
 * content ids in display order).
 *
 * USAGE
 * ─────
 *   <EditableImageGroup id="paths-row" childIds={["card.a", "card.b"]}>
 *     <EditableImage id="card.a" defaultSrc="…" alt="…" />
 *     <EditableImage id="card.b" defaultSrc="…" alt="…" />
 *   </EditableImageGroup>
 *
 * IMPLEMENTATION NOTE
 * ───────────────────
 * The group does NOT remount children when the order changes — it
 * publishes the desired position to each child via React Context, and
 * each child applies CSS `order: N` to its outer wrapper. So the DOM
 * stays stable, no React keys move, no images re-fetch, no animations
 * restart. The visual order is repainted by flex/grid layout in O(1).
 *
 * The parent renders children inside a flex container by default so
 * the `order` property has effect. Pass `className` to override.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useEditContext } from "@/lib/edit-context";

type GroupShape = {
  groupId: string;
  /** Child ids in current display order. */
  order: string[];
  indexOf: (childId: string) => number;
  moveUp: (childId: string) => void;
  moveDown: (childId: string) => void;
  /* v6.13.35 — Native HTML5 drag-and-drop reorder. The previous
     implementation only exposed up/down arrow buttons inside the
     edit popover, which the user described as "admin still cant
     drag drop rearrange images". These four fields let an
     <EditableImage> wire its wrapper directly into the group's
     drag state:
       startDrag(id) — called from onDragStart of the dragged child
       hoverDrag(id) — called from onDragOver of any potential drop
                       target so siblings can show a "drop here"
                       outline
       endDrag()     — called from onDragEnd to clear UI state
       dropOn(id)    — called from onDrop of the target; reorders
                       so the dragged child is placed AT the target
                       child's current position (siblings shift
                       around it). */
  dragId: string | null;
  overId: string | null;
  startDrag: (childId: string) => void;
  hoverDrag: (childId: string) => void;
  endDrag: () => void;
  dropOn: (targetChildId: string) => void;
  /* v6.13.53 — Direct reorder API (independent of drag-state).
     Called by MoveHandle when its pointer-drag is released over
     a sibling: we don't have time to round-trip through React
     state (startDrag → setState → re-render → dropOn reads new
     dragId), so this method takes both ids and reorders the
     persisted array in one synchronous call. */
  reorder: (srcChildId: string, targetChildId: string) => void;
};

const Ctx = createContext<GroupShape | null>(null);

/** Children read this to discover their current display position + reorder. */
export function useEditableImageGroup(): GroupShape | null {
  return useContext(Ctx);
}

export default function EditableImageGroup({
  id,
  childIds,
  children,
  className = "flex flex-wrap items-start gap-4",
}: {
  id: string;
  /** Original DOM-order list of EditableImage ids inside this group. */
  childIds: string[];
  children: ReactNode;
  /** Override the default flex container class. Must be a flex/grid
      container for CSS `order` on children to take effect. */
  className?: string;
}) {
  const { getValue, setValue } = useEditContext();
  const stored = getValue(`imagegroup.${id}.order`, "");

  // Resolve current order: use stored order if valid, else original
  // childIds. Any new ids that weren't in the stored order are
  // appended at the end so a code-side addition still shows up
  // without requiring an admin save.
  const order = useMemo<string[]>(() => {
    if (!stored) return childIds;
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return childIds;
      const filtered = (parsed as unknown[]).filter(
        (x): x is string => typeof x === "string" && childIds.includes(x),
      );
      const missing = childIds.filter((x) => !filtered.includes(x));
      return [...filtered, ...missing];
    } catch {
      return childIds;
    }
  }, [stored, childIds]);

  const persist = (next: string[]) =>
    setValue(`imagegroup.${id}.order`, JSON.stringify(next));

  // v6.13.35 — drag-state lives in component state (not context-
  // memoized) because it changes on every dragover and we want the
  // outline-on-hover sibling to re-render in real time.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const ctx = useMemo<GroupShape>(
    () => ({
      groupId: id,
      order,
      indexOf: (childId) => order.indexOf(childId),
      moveUp: (childId) => {
        const i = order.indexOf(childId);
        if (i <= 0) return;
        const next = [...order];
        [next[i - 1], next[i]] = [next[i], next[i - 1]];
        persist(next);
      },
      moveDown: (childId) => {
        const i = order.indexOf(childId);
        if (i < 0 || i >= order.length - 1) return;
        const next = [...order];
        [next[i + 1], next[i]] = [next[i], next[i + 1]];
        persist(next);
      },
      dragId,
      overId,
      startDrag: (childId) => setDragId(childId),
      hoverDrag: (childId) => {
        // Only show outline on a sibling, never on the card you're
        // currently dragging (it's already visually "lifted").
        if (dragId && childId !== dragId) setOverId(childId);
      },
      endDrag: () => {
        setDragId(null);
        setOverId(null);
      },
      dropOn: (targetChildId) => {
        const src = dragId;
        setDragId(null);
        setOverId(null);
        if (!src || src === targetChildId) return;
        const from = order.indexOf(src);
        const to = order.indexOf(targetChildId);
        if (from < 0 || to < 0) return;
        const next = [...order];
        next.splice(from, 1);
        // Insert at target's CURRENT index. If we removed an earlier
        // entry the target's index shifted left by 1 — splice's
        // semantics handle this naturally because we already mutated
        // the array before computing the insertion point.
        const adjusted = from < to ? to - 1 : to;
        next.splice(adjusted, 0, src);
        persist(next);
      },
      /* v6.13.53 — Synchronous reorder used by MoveHandle's pointer
         drag (no HTML5 drag events involved, so no dragId state to
         consult). Mirrors the splice logic above. */
      reorder: (srcChildId, targetChildId) => {
        if (!srcChildId || !targetChildId || srcChildId === targetChildId) return;
        const from = order.indexOf(srcChildId);
        const to = order.indexOf(targetChildId);
        if (from < 0 || to < 0) return;
        const next = [...order];
        next.splice(from, 1);
        const adjusted = from < to ? to - 1 : to;
        next.splice(adjusted, 0, srcChildId);
        persist(next);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, order.join("|"), dragId, overId],
  );

  return (
    <Ctx.Provider value={ctx}>
      <div className={className} data-image-group={id}>
        {children}
      </div>
    </Ctx.Provider>
  );
}
