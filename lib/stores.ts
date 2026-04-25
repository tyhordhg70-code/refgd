import { db, withDb } from "./db";
import type { Region, Store } from "./types";

export function listStores(opts: { region?: Region; search?: string } = {}): Store[] {
  const all = Object.values(db().stores) as Store[];
  let out = all;
  if (opts.region) out = out.filter((s) => s.region === opts.region);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    out = out.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }
  return out.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
}

export function getStore(id: string): Store | null {
  return ((db().stores as Record<string, Store>)[id]) ?? null;
}

export function upsertStore(s: Store): Store {
  const now = new Date().toISOString();
  const existing = getStore(s.id);
  const merged: Store = {
    ...s,
    createdAt: existing?.createdAt ?? s.createdAt ?? now,
    updatedAt: now,
  };
  withDb((d) => {
    (d.stores as Record<string, Store>)[s.id] = merged;
  });
  return merged;
}

export function deleteStore(id: string): void {
  withDb((d) => {
    delete (d.stores as Record<string, Store>)[id];
  });
}

export function regionCounts(): Record<Region, number> {
  const out: Record<Region, number> = { USA: 0, CAD: 0, EU: 0, UK: 0 };
  for (const s of Object.values(db().stores) as Store[]) {
    if (s.region in out) out[s.region]++;
  }
  return out;
}
