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

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useEditContext } from "@/lib/edit-context";

type GroupShape = {
  groupId: string;
  /** Child ids in current display order. */
  order: string[];
  indexOf: (childId: string) => number;
  moveUp: (childId: string) => void;
  moveDown: (childId: string) => void;
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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, order.join("|")],
  );

  return (
    <Ctx.Provider value={ctx}>
      <div className={className} data-image-group={id}>
        {children}
      </div>
    </Ctx.Provider>
  );
}
