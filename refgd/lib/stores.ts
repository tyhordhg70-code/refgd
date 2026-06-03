import { getPool, initDb } from "./db";
import {
  getCachedStores,
  setCachedStores,
  invalidateStores,
} from "./cache";
import type { Region, Store, StoreCategory } from "./types";

/**
 * pg returns TIMESTAMPTZ columns as native JS Date objects. Calling
 * String() on a Date yields the JS toString format
 *   "Sat Apr 25 2026 23:55:44 GMT+0000 (Coordinated Universal Time)"
 * which Postgres CANNOT parse back when we feed the same value into a
 * later UPDATE — the upsert fails with `invalid input syntax for type
 * timestamp with time zone`. We must always serialise as ISO 8601.
 */
function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) {
    // Already a string — try to round-trip it through Date so we
    // normalise legacy values too. If parsing fails, keep the raw
    // string (the DB will reject it but at least we won't crash here).
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Parse a DB column that may be:
 *   - an old plain string  "USA"         → ["USA"]
 *   - a JSON string array  '["USA","EU"]' → ["USA","EU"]
 *   - a JSON scalar        '"USA"'        → ["USA"]
 */
function parseJsonArray<T>(raw: unknown, fallback: T): T[] {
  if (raw == null) return [fallback];
  const s = String(raw).trim();
  if (!s) return [fallback];
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.length > 0 ? (parsed as T[]) : [fallback];
    return [parsed as T];
  } catch {
    // old plain-text value like "USA" or "Electronics"
    return [s as unknown as T];
  }
}

/**
 * Parse the JSON `tags` column defensively. A malformed value must NEVER
 * throw — a single bad row would otherwise blow up the entire
 * `rows.map(rowToStore)` in loadAll(), make loadAll() return [], and wipe
 * the whole store list ("edit vanishes everything"). Mirrors the safety
 * already applied to region/category via parseJsonArray.
 */
function parseTags(raw: unknown): Store["tags"] {
  if (raw == null) return [];
  try {
    const parsed = JSON.parse(String(raw) || "[]");
    return Array.isArray(parsed) ? (parsed as Store["tags"]) : [];
  } catch {
    return [];
  }
}

function rowToStore(row: Record<string, unknown>): Store {
  return {
    id: row.id as string,
    name: row.name as string,
    domain: (row.domain as string | null) ?? null,
    regions: parseJsonArray<Region>(row.region, "USA"),
    categories: parseJsonArray<StoreCategory>(row.category, "Other"),
    priceLimit: (row.price_limit as string | null) ?? null,
    itemLimit: (row.item_limit as string | null) ?? null,
    fee: (row.fee as string | null) ?? null,
    timeframe: (row.timeframe as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    tags: parseTags(row.tags),
    prismaticGlow: Boolean(row.prismatic_glow),
    logoUrl: (row.logo_url as string | null) ?? null,
    rawText: (row.raw_text as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** Load all stores from DB into cache (called once on first request). */
async function loadAll(): Promise<Store[]> {
  // Retry transient failures in-line before giving up. The most common
  // cause of a [] result on Render is a Neon free-tier cold-start or the
  // connection pool being momentarily saturated — e.g. when the inline
  // editor's content flush() and the subsequent router.refresh() both hit
  // the DB at once. A couple of short retries lets the pool drain / Neon
  // wake before we surface an empty list (which would blank the page).
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await initDb();
      const { rows } = await getPool().query(
        "SELECT * FROM stores ORDER BY sort_order ASC, name ASC"
      );
      const stores = rows.map(rowToStore);
      setCachedStores(stores);
      return stores;
    } catch (err) {
      lastErr = err;
      // Always log — this is a critical failure regardless of environment.
      console.error(
        `[stores] DB load failed (attempt ${attempt}/${MAX_ATTEMPTS}):`,
        (err as Error).message,
      );
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
    }
  }
  // Do NOT cache the failure. Leaving the cache as null means the next
  // request will call loadAll() again and retry the DB, so a transient
  // connection blip doesn't permanently empty the store list for the
  // lifetime of the server process.
  console.error(
    "[stores] DB load failed after retries, returning empty (cache NOT poisoned):",
    (lastErr as Error)?.message,
  );
  return [];
}

/** Get the full store list, using cache when available. */
async function getAllStores(): Promise<Store[]> {
  return getCachedStores() ?? (await loadAll());
}

/**
 * List stores with optional region + search filters.
 * Filtering is done in-memory against the cache — no extra DB round-trips.
 */
export async function listStores(
  opts: { region?: Region; search?: string } = {}
): Promise<Store[]> {
  let stores = await getAllStores();

  if (opts.region) {
    stores = stores.filter((s) => s.regions.includes(opts.region!));
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    stores = stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q) ||
        s.categories.some((c) => c.toLowerCase().includes(q))
    );
  }
  return stores;
}

export async function getStore(id: string): Promise<Store | null> {
  const stores = await getAllStores();
  return stores.find((s) => s.id === id) ?? null;
}

export async function upsertStore(s: Store): Promise<Store> {
  await initDb();
  const pool = getPool();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO stores
       (id, name, domain, region, category, price_limit, item_limit, fee, timeframe,
        notes, tags, prismatic_glow, logo_url, raw_text, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (id) DO UPDATE SET
       name          = EXCLUDED.name,
       domain        = EXCLUDED.domain,
       region        = EXCLUDED.region,
       category      = EXCLUDED.category,
       price_limit   = EXCLUDED.price_limit,
       item_limit    = EXCLUDED.item_limit,
       fee           = EXCLUDED.fee,
       timeframe     = EXCLUDED.timeframe,
       notes         = EXCLUDED.notes,
       tags          = EXCLUDED.tags,
       prismatic_glow= EXCLUDED.prismatic_glow,
       logo_url      = EXCLUDED.logo_url,
       raw_text      = EXCLUDED.raw_text,
       sort_order    = EXCLUDED.sort_order,
       updated_at    = EXCLUDED.updated_at`,
    [
      s.id, s.name, s.domain ?? null,
      JSON.stringify(s.regions ?? ["USA"]),
      JSON.stringify(s.categories ?? ["Other"]),
      s.priceLimit ?? null, s.itemLimit ?? null, s.fee ?? null,
      s.timeframe ?? null, s.notes ?? null,
      JSON.stringify(s.tags ?? []),
      s.prismaticGlow ?? false,
      s.logoUrl ?? null, s.rawText ?? null,
      s.sortOrder ?? 0,
      s.createdAt ?? now, now,
    ]
  );
  invalidateStores();
  return { ...s, updatedAt: now };
}

export async function deleteStore(id: string): Promise<void> {
  await initDb();
  await getPool().query("DELETE FROM stores WHERE id = $1", [id]);
  invalidateStores();
}

export async function regionCounts(): Promise<Record<Region, number>> {
  const stores = await getAllStores();
  const out: Record<Region, number> = { USA: 0, CAD: 0, EU: 0, UK: 0 };
  for (const s of stores) {
    for (const r of s.regions) {
      if (r in out) out[r as Region]++;
    }
  }
  return out;
}
