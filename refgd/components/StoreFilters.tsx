"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Store, Region, StoreCategory } from "@/lib/types";
import RegionFlag from "./RegionFlag";
import StoreCard from "./StoreCard";
import StoreEditDialog from "./StoreEditDialog";
import CategoryFilter from "./CategoryFilter";
import { motion, AnimatePresence } from "framer-motion";
import { useEditContext } from "@/lib/edit-context";

interface Props {
  stores: Store[];
  /** Server-rendered initial category lists so the filter dropdown
   *  isn't empty on first paint. Client refreshes on focus / after
   *  admin add/remove. */
  initialCategories?: string[];
  initialExtras?: string[];
  initialCanned?: string[];
}

const REGIONS: { id: Region; label: string }[] = [
  { id: "USA", label: "USA" },
  { id: "CAD", label: "Canada" },
  { id: "EU", label: "Europe" },
  { id: "UK", label: "United Kingdom" },
];

/**
 * Category display order — mirrors the original refundgod.io page where
 * "Electronics & high-resell" sits at the top, then clothing, then home,
 * etc. Anything not in this list is appended in alpha order.
 */
const CATEGORY_ORDER: StoreCategory[] = [
  "Electronics",
  "Clothing",
  "Home",
  "Jewelry",
  "Food",
  "Meal Plans",
  "Other",
];

const CATEGORY_LABEL: Record<string, string> = {
  Electronics: "🎮 Electronics & High-Resell",
  Clothing:    "👕 Clothing",
  Home:        "🏠 Home & Furniture",
  Jewelry:     "💎 Jewelry",
  Food:        "🍔 Food",
  "Meal Plans": "🥗 Meal Plans",
  Other:       "✨ Other",
};

export default function StoreFilters({
  stores: initialStores,
  initialCategories = [],
  initialExtras = [],
  initialCanned = [],
}: Props) {
  const [region, setRegion] = useState<Region>("USA");
  const [search, setSearch] = useState("");

  // Local mirror of the store list. Inline edit/add/delete/reorder
  // mutate this in place so the admin sees changes immediately without
  // a full page reload. On non-admin sessions this just equals props.
  const [stores, setStores] = useState<Store[]>(initialStores);
  useEffect(() => { setStores(initialStores); }, [initialStores]);

  // Category-filter state (multi-select). Empty Set = "all categories".
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(),
  );
  // Available category options for the filter dropdown. Server-seeded
  // for first paint, then refreshed from /api/categories on mount and
  // after any admin add/remove from the dropdown's inline manager.
  const [categoryOptions, setCategoryOptions] = useState<string[]>(initialCategories);
  const [cannedSet, setCannedSet] = useState<Set<string>>(() => new Set(initialCanned));
  const [extrasSet, setExtrasSet] = useState<Set<string>>(() => new Set(initialExtras));

  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories", { credentials: "same-origin" });
      if (!res.ok) return;
      const j = await res.json();
      setCategoryOptions(Array.isArray(j.categories) ? j.categories : []);
      setCannedSet(new Set(Array.isArray(j.canned) ? j.canned : []));
      setExtrasSet(new Set(Array.isArray(j.extras) ? j.extras : []));
    } catch (err) {
      // Best-effort — UI keeps working with the seeded list.
      console.warn("[store-list] couldn't refresh categories", err);
    }
  }, []);
  useEffect(() => { void refreshCategories(); }, [refreshCategories]);

  const { isAdmin, editMode } = useEditContext();

  // Edit-dialog state. `null` store + a defaultRegion/Category means
  // "create a new store seeded into that section".
  const [dialog, setDialog] = useState<
    | { open: false }
    | { open: true; store: Store | null; region: Region; category: StoreCategory }
  >({ open: false });

  // Drag-reorder bookkeeping. We only allow reordering inside the
  // currently-rendered category to keep semantics simple — moving a
  // card across categories should use Edit.
  const dragId = useRef<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Region, number> = { USA: 0, CAD: 0, EU: 0, UK: 0 };
    for (const s of stores) c[s.region]++;
    return c;
  }, [stores]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const catFilterActive = selectedCategories.size > 0;
    return stores.filter((s) => {
      if (s.region !== region) return false;
      if (catFilterActive && !selectedCategories.has(s.category)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.domain ?? "").toLowerCase().includes(q)
      );
    });
  }, [stores, region, search, selectedCategories]);

  // Group by category. Three rendering rules layered together:
  //  1. Categories with stores ALWAYS render.
  //  2. Empty CATEGORY_ORDER buckets render in admin edit mode (so the
  //     admin sees a "+ Add" tile under each canned section) — UNLESS
  //     a category filter or search is active, which would muddy the
  //     filter result.
  //  3. When a category filter IS active, every selected category
  //     renders even if it has zero stores in the current region —
  //     this gives the visitor explicit feedback ("0 stores in Toys
  //     for EU") instead of silently dropping the section.
  const grouped = useMemo(() => {
    const catFilterActive = selectedCategories.size > 0;
    const showEmptyAdminBuckets =
      isAdmin && editMode && !search.trim() && !catFilterActive;
    const map = new Map<string, Store[]>();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    const ordered: { category: StoreCategory; stores: Store[] }[] = [];
    const emit = (cat: string, list: Store[]) =>
      ordered.push({ category: cat as StoreCategory, stores: list });

    // Pass 1: canned order.
    for (const cat of CATEGORY_ORDER) {
      const list = map.get(cat) ?? [];
      if (catFilterActive) {
        if (selectedCategories.has(cat)) emit(cat, list); // always render selected
      } else if (list.length > 0 || showEmptyAdminBuckets) {
        emit(cat, list);
      }
      map.delete(cat);
    }

    // Pass 2: leftover categories (admin extras / legacy / typos) in
    // alpha order. Same selection rules.
    const leftover = Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    for (const [cat, list] of leftover) {
      if (catFilterActive) {
        if (selectedCategories.has(cat)) emit(cat, list);
      } else if (list.length > 0) {
        emit(cat, list);
      }
    }

    // Pass 3: any selected category that wasn't seen at all (e.g. an
    // admin extra with no stores anywhere) still gets rendered as an
    // empty section so the filter chip's selection is reflected.
    if (catFilterActive) {
      const seen = new Set(ordered.map((o) => o.category));
      for (const cat of selectedCategories) {
        if (!seen.has(cat as StoreCategory)) emit(cat, []);
      }
    }

    return ordered;
  }, [filtered, isAdmin, editMode, search, selectedCategories]);

  // ───── inline CRUD handlers ────────────────────────────────────────

  function openAdd(category: StoreCategory) {
    setDialog({ open: true, store: null, region, category });
  }
  function openEdit(s: Store) {
    setDialog({ open: true, store: s, region: s.region, category: s.category });
  }

  async function handleDelete(s: Store) {
    // Optimistic remove; rollback on failure.
    const snapshot = stores;
    setStores((cur) => cur.filter((x) => x.id !== s.id));
    try {
      const res = await fetch(`/api/admin/stores/${s.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    } catch (err) {
      console.error("[store-list] delete failed", err);
      alert("Couldn't delete that store. Restoring it.");
      setStores(snapshot);
    }
  }

  function handleSaved(saved: Store) {
    setStores((cur) => {
      const i = cur.findIndex((x) => x.id === saved.id);
      if (i >= 0) {
        const next = cur.slice();
        next[i] = saved;
        return next;
      }
      return [...cur, saved];
    });
  }

  // ───── drag reorder within a category ─────────────────────────────

  function onDragStart(s: Store) {
    return (e: React.DragEvent<HTMLElement>) => {
      dragId.current = s.id;
      e.dataTransfer.effectAllowed = "move";
      // Setting data is required for Firefox to actually start a drag.
      try { e.dataTransfer.setData("text/plain", s.id); } catch {}
    };
  }
  function onDragOver(e: React.DragEvent<HTMLElement>) {
    if (!dragId.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(target: Store) {
    return async (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      const sourceId = dragId.current;
      dragId.current = null;
      if (!sourceId || sourceId === target.id) return;

      const source = stores.find((x) => x.id === sourceId);
      if (!source || source.category !== target.category || source.region !== target.region) {
        // Cross-section drag is intentionally a no-op — admins should
        // use Edit to change category/region explicitly.
        return;
      }

      // Build the new ordering for this (region, category) bucket.
      // Sort by (sortOrder asc, name asc) — same tiebreaker the server
      // uses — so the reorder lines up with what the admin actually
      // SEES on the page when sortOrder values collide (e.g. legacy
      // rows that all default to 0). Without this, a drop to "position
      // 3" can land somewhere else once persisted.
      const bucket = stores
        .filter((x) => x.region === source.region && x.category === source.category)
        .sort((a, b) => {
          const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          return so !== 0 ? so : a.name.localeCompare(b.name);
        });
      const fromIdx = bucket.findIndex((x) => x.id === sourceId);
      const toIdx = bucket.findIndex((x) => x.id === target.id);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = bucket.splice(fromIdx, 1);
      bucket.splice(toIdx, 0, moved);

      // Reassign sortOrder densely (10, 20, 30…) so future inserts
      // have wiggle room without renumbering everything. Server route
      // requires every value to be a finite integer.
      const reordered = bucket.map((s, i) => ({ ...s, sortOrder: (i + 1) * 10 }));
      const idToOrder = new Map(reordered.map((s) => [s.id, s.sortOrder!]));

      // Optimistic local update.
      const snapshot = stores;
      setStores((cur) =>
        cur.map((s) => (idToOrder.has(s.id) ? { ...s, sortOrder: idToOrder.get(s.id)! } : s)),
      );

      try {
        const res = await fetch("/api/admin/stores/reorder", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            order: reordered.map((s) => ({ id: s.id, sortOrder: s.sortOrder })),
          }),
        });
        if (!res.ok) {
          // Surface the server's actual error message so admins can see
          // WHY the save failed (DB outage, validation, auth) instead
          // of the generic "Couldn't save the new order".
          let detail = "";
          try {
            const j = await res.clone().json();
            detail = j?.error || "";
          } catch {
            try { detail = (await res.clone().text()).slice(0, 200); } catch {}
          }
          throw new Error(detail || `Reorder failed: HTTP ${res.status}`);
        }
      } catch (err) {
        console.error("[store-list] reorder failed", err);
        const msg = err instanceof Error ? err.message : "unknown error";
        alert(`Couldn't save the new order: ${msg}\nReverting.`);
        setStores(snapshot);
      }
    };
  }

  return (
    <div>
      {/* Region selector — radio-style, only one active at a time */}
      <div
        role="radiogroup"
        aria-label="Filter stores by region"
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {REGIONS.map((r) => {
          const active = region === r.id;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setRegion(r.id)}
              data-testid={`store-region-${r.id}`}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-amber-400/70 bg-gradient-to-br from-amber-500/25 to-orange-500/10 shadow-[0_0_30px_-10px_rgba(245,185,69,0.7)]"
                  // Inactive: bumped from `border-white/10 bg-white/5 opacity-60`
                  // — that combo made the cards almost invisible against the
                  // dark backdrop. Now: stronger border, lifted background
                  // wash, and full opacity so all four regions stay legible.
                  : "border-white/25 bg-white/[0.09] opacity-100 hover:border-white/40 hover:bg-white/[0.13]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="overflow-hidden rounded-md ring-1 ring-white/15">
                  <RegionFlag region={r.id} className="h-8 w-12" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{r.label}</div>
                  <div className="text-xs text-white/50">{counts[r.id]} stores</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${region} stores, categories or notes…`}
            className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            suppressHydrationWarning
            data-testid="store-search"
          />
        </div>
      </div>

      {/* Category filter — visible to ALL visitors. Multi-select; admins
          in edit mode also get inline category management (add new /
          remove unused). Sits directly below the search per UX spec. */}
      <div className="mb-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter
          options={categoryOptions}
          labels={CATEGORY_LABEL}
          selected={selectedCategories}
          onChange={setSelectedCategories}
          removable={
            // Removable = admin extras that aren't currently in use.
            // We pass the full extras set; the panel only renders the
            // ✕ when isAdmin && editMode AND the server allows the
            // delete (server enforces the in-use check too).
            new Set(
              Array.from(extrasSet).filter((c) => !cannedSet.has(c)),
            )
          }
          onCategoriesUpdated={({ categories, extras, canned }) => {
            setCategoryOptions(categories);
            setCannedSet(new Set(canned));
            setExtrasSet(new Set(extras));
          }}
        />
        {selectedCategories.size > 0 && (
          <button
            type="button"
            onClick={() => setSelectedCategories(new Set())}
            className="self-start text-xs font-semibold uppercase tracking-wider text-white/55 transition hover:text-amber-200 sm:self-auto"
          >
            Clear category filter
          </button>
        )}
      </div>

      <p className="mb-6 text-sm text-white/55">
        Showing <span className="font-semibold text-white">{filtered.length}</span>{" "}
        {region} {filtered.length === 1 ? "store" : "stores"}
        {isAdmin && editMode && (
          <span className="ml-3 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200">
            edit mode — hover a card
          </span>
        )}
      </p>

      {/* Categorized grid.
          NOTE: framer-motion's `layout` prop emits a server-side
          transform that the client re-measures, which trips React's
          "Extra attributes from the server: style" hydration warning.
          We drop `layout` and rely on initial/animate for entrance. */}
      <AnimatePresence>
        <div className="space-y-12">
          {grouped.map(({ category, stores: list }, secIdx) => (
            <motion.section
              key={category}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(secIdx * 0.05, 0.2) }}
              suppressHydrationWarning
            >
              <div className="mb-5 text-center">
                <h3 className="prismatic-text heading-display inline-block text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                  {CATEGORY_LABEL[category] ?? category}
                </h3>
                <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
                  {list.length} {list.length === 1 ? "store" : "stores"}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* "+ Add" tile renders FIRST in every category so the
                    admin's most common action — adding a new store —
                    sits at the top of each section instead of being
                    buried after the cards. */}
                {isAdmin && editMode && (
                  <button
                    type="button"
                    onClick={() => openAdd(category)}
                    className="flex min-h-[148px] items-center justify-center rounded-2xl border-2 border-dashed border-amber-300/40 bg-amber-400/5 text-sm font-semibold text-amber-200 transition hover:border-amber-300/80 hover:bg-amber-400/10 hover:text-amber-100"
                    data-testid={`store-add-${category}`}
                  >
                    + Add store to {CATEGORY_LABEL[category] ?? category}
                  </button>
                )}

                {list.map((s, i) => (
                  <StoreCard
                    key={s.id}
                    store={s}
                    idx={i}
                    onEdit={isAdmin && editMode ? openEdit : undefined}
                    onDelete={isAdmin && editMode ? handleDelete : undefined}
                    draggable={isAdmin && editMode}
                    onDragStart={isAdmin && editMode ? onDragStart(s) : undefined}
                    onDragOver={isAdmin && editMode ? onDragOver : undefined}
                    onDrop={isAdmin && editMode ? onDrop(s) : undefined}
                    onDragEnd={isAdmin && editMode ? () => { dragId.current = null; } : undefined}
                  />
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      </AnimatePresence>

      {filtered.length === 0 && !(isAdmin && editMode) && (
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-white/65">No stores match your filters.</p>
          <button
            type="button"
            onClick={() => { setSearch(""); setRegion("USA"); }}
            className="btn-ghost mt-4"
          >
            Reset filters
          </button>
        </div>
      )}

      <StoreEditDialog
        open={dialog.open}
        store={dialog.open ? dialog.store : null}
        defaultRegion={dialog.open ? dialog.region : region}
        defaultCategory={dialog.open ? dialog.category : "Other"}
        availableCategories={categoryOptions}
        onCategoryAdded={refreshCategories}
        onClose={() => setDialog({ open: false })}
        onSaved={handleSaved}
      />
    </div>
  );
}
