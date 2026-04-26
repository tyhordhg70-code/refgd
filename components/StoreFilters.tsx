"use client";
import { useMemo, useState } from "react";
import type { Store, Region, StoreCategory } from "@/lib/types";
import RegionFlag from "./RegionFlag";
import StoreCard from "./StoreCard";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  stores: Store[];
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

export default function StoreFilters({ stores }: Props) {
  // Single-region selector (the previous multi-select toggle was the bug:
  // when all four were active it was equivalent to "no filter").
  const [region, setRegion] = useState<Region>("USA");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<Region, number> = { USA: 0, CAD: 0, EU: 0, UK: 0 };
    for (const s of stores) c[s.region]++;
    return c;
  }, [stores]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter((s) => {
      if (s.region !== region) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.domain ?? "").toLowerCase().includes(q)
      );
    });
  }, [stores, region, search]);

  // Group by category in CATEGORY_ORDER, then any extras
  const grouped = useMemo(() => {
    const map = new Map<string, Store[]>();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    const ordered: { category: string; stores: Store[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      if (map.has(cat) && map.get(cat)!.length > 0) {
        ordered.push({ category: cat, stores: map.get(cat)! });
        map.delete(cat);
      }
    }
    for (const [cat, list] of Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      if (list.length > 0) ordered.push({ category: cat, stores: list });
    }
    return ordered;
  }, [filtered]);

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
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-amber-400/60 bg-gradient-to-br from-amber-500/20 to-orange-500/8 shadow-[0_0_30px_-10px_rgba(245,185,69,0.65)]"
                  : "border-white/10 bg-white/5 opacity-60 hover:opacity-100"
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          />
        </div>
      </div>

      <p className="mb-6 text-sm text-white/55">
        Showing <span className="font-semibold text-white">{filtered.length}</span>{" "}
        {region} {filtered.length === 1 ? "store" : "stores"}
      </p>

      {/* Categorized grid */}
      <AnimatePresence mode="popLayout">
        <motion.div layout className="space-y-12">
          {grouped.map(({ category, stores: list }, secIdx) => (
            <motion.section
              key={category}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(secIdx * 0.05, 0.2) }}
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
                {list.map((s, i) => (
                  <StoreCard key={s.id} store={s} idx={i} />
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
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
    </div>
  );
}
