"use client";

/**
 * Inline-editor state container.
 *
 * One client-side React Context owns:
 *   - whether the visitor is an admin (server-checked once per page)
 *   - whether edit mode is currently ON (toggle in toolbar)
 *   - the live map of content-block values (defaults + DB overrides)
 *   - a queue of UNSAVED edits keyed by content id
 *   - an undo / redo history stack of those edits
 *
 * Editable* primitives read `getValue(id)` and call `setValue(id, next)` —
 * they don't need to know about persistence or history.
 *
 * Persistence happens only on Save (Publish) via `flush()` which sends a
 * single PUT to /api/admin/content. Discard wipes the queue without
 * touching the DB.
 *
 * The undo/redo stack stores one entry per `setValue` call. Undo replays
 * `prev` for the most recent action; redo re-applies `next`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ContentMap = Record<string, string>;

type HistoryEntry = {
  id: string;
  prev: string;
  next: string;
};

type EditContextShape = {
  /** Server-confirmed admin? */
  isAdmin: boolean;
  /** Edit-mode toggle (only meaningful when isAdmin). */
  editMode: boolean;
  setEditMode: (v: boolean) => void;

  /** Resolve the current displayed value for a content id. */
  getValue: (id: string, fallback?: string) => string;
  /** Queue a new value (or commit it locally for inline rendering). */
  setValue: (id: string, next: string) => void;

  /** True when there are queued edits not yet persisted. */
  dirty: boolean;
  /** Number of distinct content ids with pending edits. */
  pendingCount: number;

  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  /** PUT all pending content edits in one batch. Returns true on success. */
  flush: () => Promise<boolean>;
  /** Drop all pending edits and revert displayed values to the last saved snapshot. */
  discard: () => void;

  /** Bump after Save to ask any external lists (stores) to refetch. */
  contentVersion: number;
};

const Ctx = createContext<EditContextShape | null>(null);

export function useEditContext(): EditContextShape {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEditContext must be used inside <EditProvider>");
  return v;
}

type Props = {
  initialAdmin: boolean;
  /** Server-rendered map of all content-block ids → resolved values. */
  initialContent: ContentMap;
  children: ReactNode;
};

export default function EditProvider({ initialAdmin, initialContent, children }: Props) {
  const [isAdmin, setIsAdmin] = useState<boolean>(initialAdmin);
  const [editMode, setEditModeRaw] = useState<boolean>(false);

  // Hydrate edit-mode from localStorage so it survives hard navigations
  // between pages. Admin sessions persist the last-known toggle until
  // the user clicks "Exit edit mode" or logs out (which clears the key
  // via /api/admin/logout's client-side handler).
  useEffect(() => {
    if (!initialAdmin) return;
    try {
      const v = window.localStorage.getItem("refgd:editMode");
      if (v === "1") setEditModeRaw(true);
    } catch {
      /* localStorage unavailable */
    }
  }, [initialAdmin]);

  const setEditMode = useCallback((v: boolean) => {
    setEditModeRaw(v);
    try {
      if (v) window.localStorage.setItem("refgd:editMode", "1");
      else window.localStorage.removeItem("refgd:editMode");
    } catch {}
  }, []);

  /** The committed snapshot — what's currently on the server (or assumed to be). */
  const savedRef = useRef<ContentMap>({ ...initialContent });
  /** The displayed map — committed snapshot + queued edits applied. */
  const [display, setDisplay] = useState<ContentMap>({ ...initialContent });
  /** Pending edits not yet saved. Keys are content ids. */
  const [pending, setPending] = useState<ContentMap>({});

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyPos, setHistoryPos] = useState<number>(0);
  const [contentVersion, setContentVersion] = useState<number>(0);

  // Re-check admin status when the tab regains focus — a logout in
  // another tab should hide the toolbar without a hard reload.
  useEffect(() => {
    const refresh = () => {
      fetch("/api/admin/session", { credentials: "same-origin" })
        .then((r) => r.json())
        .then((j) => setIsAdmin(Boolean(j?.admin)))
        .catch(() => void 0);
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const getValue = useCallback(
    (id: string, fallback?: string) => {
      if (Object.prototype.hasOwnProperty.call(display, id)) return display[id];
      return fallback ?? "";
    },
    [display],
  );

  const setValue = useCallback(
    (id: string, next: string) => {
      const prev = display[id] ?? "";
      if (prev === next) return;

      // Apply visibly.
      setDisplay((m) => ({ ...m, [id]: next }));

      // Track in the pending queue (vs the saved snapshot — if the user
      // edits back to the saved value we drop it from the queue).
      setPending((q) => {
        const saved = savedRef.current[id] ?? "";
        const copy = { ...q };
        if (saved === next) delete copy[id];
        else copy[id] = next;
        return copy;
      });

      // History: drop any redo tail, then push.
      setHistory((h) => {
        const trimmed = h.slice(0, historyPos);
        return [...trimmed, { id, prev, next }];
      });
      setHistoryPos((p) => p + 1);
    },
    [display, historyPos],
  );

  const undo = useCallback(() => {
    if (historyPos <= 0) return;
    const entry = history[historyPos - 1];
    setDisplay((m) => ({ ...m, [entry.id]: entry.prev }));
    setPending((q) => {
      const saved = savedRef.current[entry.id] ?? "";
      const copy = { ...q };
      if (entry.prev === saved) delete copy[entry.id];
      else copy[entry.id] = entry.prev;
      return copy;
    });
    setHistoryPos((p) => p - 1);
  }, [history, historyPos]);

  const redo = useCallback(() => {
    if (historyPos >= history.length) return;
    const entry = history[historyPos];
    setDisplay((m) => ({ ...m, [entry.id]: entry.next }));
    setPending((q) => {
      const saved = savedRef.current[entry.id] ?? "";
      const copy = { ...q };
      if (entry.next === saved) delete copy[entry.id];
      else copy[entry.id] = entry.next;
      return copy;
    });
    setHistoryPos((p) => p + 1);
  }, [history, historyPos]);

  const flush = useCallback(async () => {
    const blocks = Object.entries(pending).map(([id, value]) => ({ id, value }));
    if (blocks.length === 0) return true;
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocks }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      // Mark these values as the new saved snapshot.
      savedRef.current = { ...savedRef.current, ...Object.fromEntries(blocks.map((b) => [b.id, b.value])) };
      setPending({});
      setHistory([]);
      setHistoryPos(0);
      setContentVersion((v) => v + 1);
      return true;
    } catch (err) {
      console.error("[edit] flush failed", err);
      return false;
    }
  }, [pending]);

  const discard = useCallback(() => {
    setDisplay({ ...savedRef.current });
    setPending({});
    setHistory([]);
    setHistoryPos(0);
  }, []);

  const value = useMemo<EditContextShape>(
    () => ({
      isAdmin,
      editMode,
      setEditMode: (v) => setEditMode(isAdmin ? v : false),
      getValue,
      setValue,
      dirty: Object.keys(pending).length > 0,
      pendingCount: Object.keys(pending).length,
      canUndo: historyPos > 0,
      canRedo: historyPos < history.length,
      undo,
      redo,
      flush,
      discard,
      contentVersion,
    }),
    [isAdmin, editMode, getValue, setValue, pending, history, historyPos, undo, redo, flush, discard, contentVersion],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
