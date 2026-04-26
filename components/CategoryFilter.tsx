"use client";

/**
 * Multi-select category filter dropdown shown below the search input on
 * /store-list. Visible to ALL visitors (not just admins). Admins in
 * edit mode also see "+ Add new category" and can remove unused
 * admin-curated categories from the same panel.
 *
 * Design notes:
 * - Anchored under its trigger button via absolute positioning. Closes
 *   on outside click + Escape.
 * - Built-in / "canned" categories cannot be removed. Categories
 *   currently in use by stores cannot be removed either (server
 *   refuses with 409). Only purely-admin-added unused categories can
 *   be deleted from here.
 * - The dropdown intentionally stops propagation on its inner clicks
 *   so toggling a checkbox doesn't close the panel.
 */

import { useEffect, useRef, useState } from "react";
import { useEditContext } from "@/lib/edit-context";

type Props = {
  /** All available categories (canned + extras + currently used). */
  options: string[];
  /** Display labels (emoji prefixes etc). Falls back to the raw name. */
  labels?: Record<string, string>;
  /** Set of currently-selected categories. Empty = "all". */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Names that came from `extras` — only these can be removed by admins. */
  removable: Set<string>;
  /** Called when admin adds/removes a category — parent re-fetches. */
  onCategoriesUpdated: (payload: {
    categories: string[];
    extras: string[];
    canned: string[];
  }) => void;
};

export default function CategoryFilter({
  options,
  labels = {},
  selected,
  onChange,
  removable,
  onCategoriesUpdated,
}: Props) {
  const { isAdmin, editMode } = useEditContext();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setErr(null);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setErr(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle(cat: string) {
    const next = new Set(selected);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onChange(next);
  }

  function selectAll() {
    onChange(new Set());
  }

  async function handleAdd() {
    const name = adding.trim();
    if (!name) {
      setErr("Type a category name first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        let detail = "";
        try { detail = (await res.clone().json())?.error || ""; } catch {}
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const j = await res.json();
      onCategoriesUpdated({
        categories: j.categories ?? [],
        extras: j.extras ?? [],
        canned: j.canned ?? [],
      });
      setAdding("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't add category.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(cat: string) {
    if (!confirm(`Remove "${cat}" from the category list?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/categories?name=${encodeURIComponent(cat)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!res.ok) {
        let detail = "";
        try { detail = (await res.clone().json())?.error || ""; } catch {}
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const j = await res.json();
      onCategoriesUpdated({
        categories: j.categories ?? [],
        extras: j.extras ?? [],
        canned: j.canned ?? [],
      });
      // Drop it from the selection too if it was selected.
      if (selected.has(cat)) {
        const next = new Set(selected);
        next.delete(cat);
        onChange(next);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't remove category.");
    } finally {
      setBusy(false);
    }
  }

  const allActive = selected.size === 0;
  const summary = allActive
    ? "All categories"
    : selected.size === 1
      ? labels[Array.from(selected)[0]] ?? Array.from(selected)[0]
      : `${selected.size} categories selected`;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`group flex w-full items-center justify-between gap-3 rounded-full border px-5 py-3 text-sm transition sm:w-auto sm:min-w-[260px] ${
          allActive
            ? "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
            : "border-amber-300/50 bg-amber-400/10 text-amber-100 shadow-[0_0_30px_-12px_rgba(245,185,69,0.55)]"
        }`}
      >
        <span className="flex items-center gap-2.5">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M11 18h2" />
          </svg>
          <span className="font-semibold uppercase tracking-wider text-[11px] opacity-70">
            Filter by category
          </span>
          <span className="font-semibold">·</span>
          <span className="font-semibold">{summary}</span>
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 sm:right-auto z-30 mt-2 w-full sm:w-[360px] origin-top rounded-2xl border border-white/10 bg-ink-900/95 p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        >
          <div className="mb-2 flex items-center justify-between px-2 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Categories
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/85 hover:text-amber-200"
            >
              {allActive ? "All shown" : "Reset"}
            </button>
          </div>

          <div className="max-h-[340px] overflow-y-auto pr-1">
            {options.length === 0 ? (
              <p className="px-2 py-3 text-xs text-white/50">
                No categories yet.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {options.map((cat) => {
                  const on = selected.has(cat);
                  const canRemove =
                    isAdmin && editMode && removable.has(cat);
                  return (
                    <li key={cat}>
                      <div
                        className={`group/item flex items-center gap-2 rounded-lg px-2 py-2 transition ${
                          on
                            ? "bg-amber-400/10"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                          <span
                            className={`flex h-4 w-4 flex-none items-center justify-center rounded border transition ${
                              on
                                ? "border-amber-300 bg-amber-300 text-ink-950"
                                : "border-white/30 bg-transparent"
                            }`}
                          >
                            {on && (
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(cat)}
                            className="sr-only"
                          />
                          <span
                            className={`text-sm ${
                              on ? "font-semibold text-amber-100" : "text-white/85"
                            }`}
                          >
                            {labels[cat] ?? cat}
                          </span>
                        </label>
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemove(cat)}
                            disabled={busy}
                            title={`Remove "${cat}"`}
                            className="rounded-md px-2 py-0.5 text-xs text-rose-300/70 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-200 group-hover/item:opacity-100 disabled:opacity-40"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {isAdmin && editMode && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300/75">
                Add new category
              </div>
              <div className="flex items-center gap-2 px-1">
                <input
                  value={adding}
                  onChange={(e) => setAdding(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAdd();
                    }
                  }}
                  placeholder="e.g. Toys, Auto, Cosmetics…"
                  className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/60"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={busy || !adding.trim()}
                  className="rounded-md bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink-950 transition hover:brightness-110 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 px-2 text-[10px] text-white/45">
                Built-in categories can&apos;t be removed. Custom ones can
                only be removed once no store uses them.
              </p>
            </div>
          )}

          {err && (
            <div className="mt-2 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {err}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
