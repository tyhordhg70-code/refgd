"use client";
import { useEffect, useMemo, useState } from "react";
import type { Store, Region } from "@/lib/types";
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

export default function StoreFilters({ stores }: Props) {
  const [activeRegions, setActiveRegions] = useState<Set<Region>>(new Set(REGIONS.map((r) => r.id)));
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");

  const counts = useMemo(() => {
    const c: Record<Region, number> = { USA: 0, CAD: 0, EU: 0, UK: 0 };
    for (const s of stores) c[s.region]++;
    return c;
  }, [stores]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) set.add(s.category);
    return ["All", ...Array.from(set).sort()];
  }, [stores]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter((s) => {
      if (!activeRegions.has(s.region)) return false;
      if (activeCat !== "All" && s.category !== activeCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.domain ?? "").toLowerCase().includes(q)
      );
    });
  }, [stores, activeRegions, activeCat, search]);

  function toggleRegion(r: Region) {
    setActiveRegions((curr) => {
      const next = new Set(curr);
      if (next.has(r)) {
        if (next.size > 1) next.delete(r);
      } else {
        next.add(r);
      }
      return next;
    });
  }

  return (
    <div>
      {/* Region pills */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {REGIONS.map((r) => {
          const active = activeRegions.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleRegion(r.id)}
              aria-pressed={active}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-orange-500/5 shadow-[0_0_30px_-10px_rgba(245,185,69,0.5)]"
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

      {/* Search + category */}
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
            placeholder="Search stores, categories or notes…"
            className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
          />
        </div>
        <select
          value={activeCat}
          onChange={(e) => setActiveCat(e.target.value)}
          aria-label="Filter by category"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-amber-400/60 focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c} value={c} className="bg-ink-900">{c}</option>
          ))}
        </select>
      </div>

      {/* Results meta */}
      <p className="mb-4 text-sm text-white/55">
        Showing <span className="font-semibold text-white">{filtered.length}</span> of{" "}
        <span className="font-semibold text-white">{stores.length}</span> stores
      </p>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((s, i) => (
            <StoreCard key={s.id} store={s} idx={i} />
          ))}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-white/65">No stores match your filters.</p>
          <button
            type="button"
            onClick={() => { setSearch(""); setActiveCat("All"); setActiveRegions(new Set(REGIONS.map((r) => r.id))); }}
            className="btn-ghost mt-4"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
