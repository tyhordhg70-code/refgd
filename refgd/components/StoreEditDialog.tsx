"use client";

/**
 * Modal dialog for creating or editing a store inline on /store-list.
 *
 * - When `store` is null/omitted, the dialog is in "create" mode and
 *   the admin-supplied `defaultRegion` / `defaultCategory` pre-fill the
 *   selectors (so the "+ Add" button under the Electronics section
 *   defaults to Electronics).
 * - When `store` is provided, the dialog edits that store.
 *
 * Saves go directly to the stores API (not via EditContext) because
 * stores are their own resource — undo for store ops is not supported
 * in this iteration (would require a soft-delete and per-field history,
 * out of scope for option A).
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Region, Store, StoreCategory, StoreTag } from "@/lib/types";

const REGIONS: Region[] = ["USA", "CAD", "EU", "UK"];
const CATEGORIES: StoreCategory[] = [
  "Electronics", "Clothing", "Jewelry", "Food", "Meal Plans", "Home", "Other",
];
const TAGS: { id: StoreTag; label: string }[] = [
  { id: "fire", label: "🔥 hot" },
  { id: "diamond", label: "💎 premium" },
  { id: "crown", label: "👑 luxury" },
  { id: "global", label: "🌎 worldwide" },
  { id: "new", label: "✨ new" },
];

/** Result of a save. A single logical store can span multiple regions as
 *  sibling rows (one row per region, all sharing a name), so one save may
 *  create/update/delete several rows at once. */
export type StoreSaveResult = { upserts: Store[]; deletedIds: string[] };

type Props = {
  open: boolean;
  store: Store | null;
  defaultRegion?: Region;
  defaultCategory?: StoreCategory;
  /** All store rows sharing this store's name (the "logical store" across
   *  regions). Used to pre-highlight every region the store spans and to
   *  add/remove sibling rows on save. Includes the current row. */
  relatedStores?: Store[];
  /** Extra category strings (admin-created customs) to append to the
   *  dropdown so they survive editing. */
  availableCategories?: string[];
  /** Fired after a brand-new custom category was registered server-side. */
  onCategoryAdded?: () => void;
  onClose: () => void;
  onSaved: (result: StoreSaveResult) => void;
};

type Draft = {
  name: string;
  domain: string;
  regions: Region[];
  categories: StoreCategory[];
  /** Input field for adding a custom category not in the known list. */
  customCategoryInput: string;
  priceLimit: string;
  itemLimit: string;
  fee: string;
  timeframe: string;
  notes: string;
  tags: StoreTag[];
  prismaticGlow: boolean;
  logoUrl: string;
};

function emptyDraft(region: Region, category: StoreCategory): Draft {
  return {
    name: "",
    domain: "",
    regions: [region],
    categories: [category],
    customCategoryInput: "",
    priceLimit: "",
    itemLimit: "",
    // New stores default to the standard 20% rate (the overwhelming
    // majority of stores use it); admin can override before saving.
    fee: "20%",
    timeframe: "",
    notes: "",
    tags: [],
    prismaticGlow: false,
    logoUrl: "",
  };
}

function fromStore(s: Store): Draft {
  return {
    name: s.name,
    domain: s.domain ?? "",
    regions: s.regions?.length > 0 ? s.regions : ["USA"],
    categories: s.categories?.length > 0 ? s.categories : ["Other"],
    customCategoryInput: "",
    priceLimit: s.priceLimit ?? "",
    itemLimit: s.itemLimit ?? "",
    fee: s.fee ?? "",
    timeframe: s.timeframe ?? "",
    notes: s.notes ?? "",
    tags: s.tags ?? [],
    prismaticGlow: Boolean(s.prismaticGlow),
    logoUrl: s.logoUrl ?? "",
  };
}

/** Union of every region across the logical store's sibling rows, in a
 *  stable canonical order. Falls back to `fallback` when empty. */
function unionRegions(related: Store[], fallback: Region[]): Region[] {
  const set = new Set<Region>();
  for (const s of related) for (const r of s.regions ?? []) set.add(r as Region);
  const out = REGIONS.filter((r) => set.has(r));
  return out.length > 0 ? out : fallback;
}

/** Build the edit draft, pre-highlighting EVERY region the logical store
 *  spans (not just the clicked row). All other fields come from the
 *  clicked row only. */
function editDraftFrom(store: Store, related?: Store[]): Draft {
  const sibs = related && related.length > 0 ? related : [store];
  const base = fromStore(store);
  return { ...base, regions: unionRegions(sibs, base.regions) };
}

export default function StoreEditDialog({
  open,
  store,
  defaultRegion = "USA",
  defaultCategory = "Other",
  relatedStores,
  onClose,
  onSaved,
  availableCategories,
  onCategoryAdded,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() =>
    store ? editDraftFrom(store, relatedStores) : emptyDraft(defaultRegion, defaultCategory),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const insertLink = useCallback(() => {
    const ta = notesRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = draft.notes.slice(start, end);
    const label = sel || "link text";
    const snippet = `[${label}](url)`;
    const next = draft.notes.slice(0, start) + snippet + draft.notes.slice(end);
    setDraft((d) => ({ ...d, notes: next }));
    requestAnimationFrame(() => {
      ta.focus();
      const urlStart = start + 1 + label.length + 2;
      ta.setSelectionRange(urlStart, urlStart + 3);
    });
  }, [draft.notes]);

  // Reset only when the dialog (re)opens or targets a different store. We
  // intentionally do NOT depend on `relatedStores`: after a partial save the
  // parent's store list (and thus this prop) changes, and re-running the reset
  // here would clobber the user's in-progress field edits and revert them to
  // the stale snapshot, breaking retry. `relatedStores` is read fresh on open.
  useEffect(() => {
    if (!open) return;
    setDraft(store ? editDraftFrom(store, relatedStores) : emptyDraft(defaultRegion, defaultCategory));
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, store, defaultRegion, defaultCategory]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // NOTE: this useMemo MUST stay above the `if (!open) return null` early
  // return. Calling a hook after a conditional return changes the hook count
  // between the closed (open=false) and open (open=true) renders, which makes
  // React throw "Rendered more hooks than during the previous render". The
  // EditorIsland error boundary then swallows the crash and the whole store
  // card grid blanks — the exact bug reported on /store-list.
  const allKnownCats = useMemo(() => {
    const extras = (availableCategories ?? []).filter(
      (c) => !(CATEGORIES as readonly string[]).includes(c),
    );
    return [...CATEGORIES, ...extras];
  }, [availableCategories]);

  if (!open) return null;

  const setField = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  function addCustomCategory() {
    const name = draft.customCategoryInput.trim();
    if (!name) return;
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(name) ? d.categories : [...d.categories, name],
      customCategoryInput: "",
    }));
    fetch("/api/admin/categories", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then(() => onCategoryAdded?.())
      .catch(() => {});
  }

  // In edit mode the clicked row "lives" in this region — it can't be
  // un-highlighted (that would orphan the very row being edited). Use the
  // card's delete button to remove a store from its home region entirely.
  const homeRegion: Region | null = store?.id ? defaultRegion : null;

  function toggleRegion(r: Region) {
    if (homeRegion && r === homeRegion) return; // home region is locked
    if (draft.regions.includes(r)) {
      if (draft.regions.length === 1) return; // keep at least one
      setField("regions", draft.regions.filter((x) => x !== r));
    } else {
      setField("regions", [...draft.regions, r]);
    }
  }

  function toggleCategory(c: string) {
    if (draft.categories.includes(c)) {
      if (draft.categories.length === 1) return; // keep at least one
      setField("categories", draft.categories.filter((x) => x !== c));
    } else {
      setField("categories", [...draft.categories, c]);
    }
  }

  async function save() {
    if (!draft.name.trim()) {
      setErr("Name is required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      // Fields that describe the store itself. `regions` is handled
      // separately because it drives multi-row (sibling) sync.
      const fields = {
        name: draft.name.trim(),
        domain: draft.domain.trim() || null,
        categories: draft.categories,
        priceLimit: draft.priceLimit.trim() || null,
        itemLimit: draft.itemLimit.trim() || null,
        fee: draft.fee.trim() || null,
        timeframe: draft.timeframe.trim() || null,
        notes: draft.notes.trim() || null,
        tags: draft.tags,
        prismaticGlow: draft.prismaticGlow,
        logoUrl: draft.logoUrl.trim() || null,
      };

      // ── CREATE: a single new row in the highlighted region(s). ──
      if (!store?.id) {
        const res = await fetch("/api/admin/stores", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...fields, regions: draft.regions }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Save failed: ${res.status}`);
        }
        const j = await res.json();
        onSaved({ upserts: [j.store as Store], deletedIds: [] });
        onClose();
        return;
      }

      // ── EDIT: the logical store may span several regions as sibling
      //    rows. Field edits apply ONLY to the clicked row; highlighting a
      //    region adds a copy there, un-highlighting deletes that copy. ──
      const related =
        relatedStores && relatedStores.length > 0 ? relatedStores : [store];
      const target = new Set(draft.regions);
      const upserts: Store[] = [];
      const deletedIds: string[] = [];
      const failures: string[] = [];

      // 1) PATCH the clicked row. It keeps its OWN region(s) (intersected
      //    with the highlighted set), never the union — otherwise it would
      //    surface in every region.
      const ownKept = (store.regions ?? []).filter((r) => target.has(r));
      const currentRegions = ownKept.length > 0 ? ownKept : [defaultRegion];
      {
        const res = await fetch(`/api/admin/stores/${store.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...fields, regions: currentRegions }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || `Save failed: ${res.status}`);
        }
        const j = await res.json();
        upserts.push(j.store as Store);
      }

      // Which regions are already covered by OTHER rows (siblings).
      const siblingByRegion = new Map<Region, Store[]>();
      for (const s of related) {
        if (s.id === store.id) continue;
        for (const r of s.regions ?? []) {
          const list = siblingByRegion.get(r as Region) ?? [];
          list.push(s);
          siblingByRegion.set(r as Region, list);
        }
      }
      const ownSet = new Set(store.regions ?? []);

      // 2) ADD: a highlighted region with no row yet → create a copy.
      for (const r of REGIONS) {
        if (!target.has(r) || ownSet.has(r) || siblingByRegion.has(r)) continue;
        const res = await fetch("/api/admin/stores", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...fields, regions: [r] }),
        });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.store) {
          failures.push(`add ${r}`);
          continue;
        }
        upserts.push(j.store as Store);
      }

      // 3) REMOVE: a sibling whose regions are ALL un-highlighted → delete.
      //    A row that still covers a kept region is left untouched.
      const handled = new Set<string>();
      for (const [r, sibs] of siblingByRegion) {
        if (target.has(r)) continue;
        for (const s of sibs) {
          if (handled.has(s.id)) continue;
          const regs = s.regions ?? [];
          if (regs.length > 0 && regs.every((x) => !target.has(x as Region))) {
            handled.add(s.id);
            const res = await fetch(`/api/admin/stores/${s.id}`, {
              method: "DELETE",
              credentials: "same-origin",
            });
            if (!res.ok) {
              failures.push(`remove ${r}`);
              continue;
            }
            deletedIds.push(s.id);
          }
        }
      }

      onSaved({ upserts, deletedIds });
      if (failures.length > 0) {
        setErr(`Saved the current region, but some changes failed: ${failures.join(", ")}.`);
      } else {
        onClose();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={store ? `Edit ${store.name}` : "Add new store"}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="heading-display text-sm font-semibold uppercase tracking-widest text-amber-300/85">
            {store ? "Edit store" : "Add new store"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 text-white/60 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div data-lenis-prevent className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          <Field label="Name *" full>
            <input
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
              autoFocus
              className={inputCls}
            />
          </Field>
          <Field label="Domain">
            <input
              value={draft.domain}
              onChange={(e) => setField("domain", e.target.value)}
              placeholder="store.com"
              className={inputCls}
            />
          </Field>
          <Field label="Regions — highlight every region this store is in" full>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => {
                const on = draft.regions.includes(r);
                const isHome = homeRegion === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRegion(r)}
                    aria-pressed={on}
                    title={
                      isHome
                        ? "Current region — edits below apply here"
                        : on
                          ? "This store is in this region"
                          : "Add this store to this region"
                    }
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold ring-1 transition ${
                      isHome ? "cursor-default " : ""
                    }${
                      on
                        ? "bg-amber-400/20 text-amber-100 ring-amber-300/50"
                        : "bg-white/5 text-white/60 ring-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {r}
                    {isHome ? " ●" : ""}
                  </button>
                );
              })}
            </div>
            {store?.id && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
                Highlighting a region adds this store there; un-highlighting removes
                that region&apos;s copy. Field edits below apply only to the current
                region ({homeRegion}).
              </p>
            )}
          </Field>
          <Field label="Categories — pick all that apply" full>
            <div className="flex flex-wrap gap-2">
              {allKnownCats.map((c) => {
                const on = draft.categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    data-testid={c === "Other" ? "store-category-select" : undefined}
                    className={`rounded-full px-3 py-1 text-xs ring-1 transition ${
                      on
                        ? "bg-amber-400/20 text-amber-100 ring-amber-300/50"
                        : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
              {draft.categories
                .filter((c) => !(allKnownCats as readonly string[]).includes(c))
                .map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ring-1 bg-violet-500/20 text-violet-200 ring-violet-400/40"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => toggleCategory(c)}
                      className="opacity-60 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={draft.customCategoryInput}
                onChange={(e) => setField("customCategoryInput", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCustomCategory(); }
                }}
                placeholder="Add custom category…"
                data-testid="store-custom-category-input"
                className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-amber-300/60"
              />
              <button
                type="button"
                onClick={addCustomCategory}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:text-white transition-colors"
              >
                Add
              </button>
            </div>
          </Field>
          <Field label="Logo URL">
            <input
              value={draft.logoUrl}
              onChange={(e) => setField("logoUrl", e.target.value)}
              placeholder="auto-fetched if blank"
              className={inputCls}
            />
          </Field>
          <Field label="Price limit">
            <input value={draft.priceLimit} onChange={(e) => setField("priceLimit", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Item limit">
            <input value={draft.itemLimit} onChange={(e) => setField("itemLimit", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fee">
            <input value={draft.fee} onChange={(e) => setField("fee", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Timeframe">
            <input value={draft.timeframe} onChange={(e) => setField("timeframe", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notes" full>
            <div className="overflow-hidden rounded-md border border-white/10 bg-white/5 transition-colors focus-within:border-amber-300/60">
              <div className="flex items-center gap-0.5 border-b border-white/10 bg-white/[0.04] px-2 py-1">
                <button
                  type="button"
                  title="Insert link — [text](url). Select text first to wrap it."
                  onClick={insertLink}
                  className="rounded px-2 py-0.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  🔗 Link
                </button>
              </div>
              <textarea
                ref={notesRef}
                value={draft.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={3}
                className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 resize-none"
              />
            </div>
          </Field>
          <Field label="Tags" full>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const on = draft.tags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setField(
                        "tags",
                        on ? draft.tags.filter((x) => x !== t.id) : [...draft.tags, t.id],
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs ring-1 ${
                      on
                        ? "bg-amber-400/20 text-amber-100 ring-amber-300/50"
                        : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        {err && (
          <div className="border-t border-rose-400/30 bg-rose-500/10 px-5 py-2 text-xs text-rose-200">
            {err}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-ink-950/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 text-sm font-bold text-ink-950 transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving…" : store ? "Save changes" : "Add store"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/60";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/45">{label}</div>
      {children}
    </label>
  );
}
