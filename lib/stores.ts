import { getPool, initDb } from "./db";
import type { Region, Store } from "./types";

function rowToStore(row: Record<string, unknown>): Store {
  return {
    id: row.id as string,
    name: row.name as string,
    domain: (row.domain as string | null) ?? null,
    region: row.region as Region,
    category: (row.category as Store["category"]) ?? "Other",
    priceLimit: (row.price_limit as string | null) ?? null,
    itemLimit: (row.item_limit as string | null) ?? null,
    fee: (row.fee as string | null) ?? null,
    timeframe: (row.timeframe as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    tags: JSON.parse((row.tags as string) || "[]") as Store["tags"],
    prismaticGlow: Boolean(row.prismatic_glow),
    logoUrl: (row.logo_url as string | null) ?? null,
    rawText: (row.raw_text as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
  };
}

export async function listStores(opts: { region?: Region; search?: string } = {}): Promise<Store[]> {
  await initDb();
  const pool = getPool();
  let sql = "SELECT * FROM stores WHERE 1=1";
  const params: unknown[] = [];

  if (opts.region) {
    params.push(opts.region);
    sql += ` AND region = $${params.length}`;
  }
  if (opts.search) {
    params.push(`%${opts.search.toLowerCase()}%`);
    sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(notes,'')) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
  }
  sql += " ORDER BY sort_order ASC, name ASC";

  const { rows } = await pool.query(sql, params);
  return rows.map(rowToStore);
}

export async function getStore(id: string): Promise<Store | null> {
  await initDb();
  const pool = getPool();
  const { rows } = await pool.query("SELECT * FROM stores WHERE id = $1", [id]);
  if (!rows.length) return null;
  return rowToStore(rows[0]);
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
      s.id, s.name, s.domain ?? null, s.region, s.category,
      s.priceLimit ?? null, s.itemLimit ?? null, s.fee ?? null,
      s.timeframe ?? null, s.notes ?? null,
      JSON.stringify(s.tags ?? []),
      s.prismaticGlow ?? false,
      s.logoUrl ?? null, s.rawText ?? null,
      s.sortOrder ?? 0,
      s.createdAt ?? now, now,
    ]
  );
  return { ...s, updatedAt: now };
}

export async function deleteStore(id: string): Promise<void> {
  await initDb();
  const pool = getPool();
  await pool.query("DELETE FROM stores WHERE id = $1", [id]);
}

export async function regionCounts(): Promise<Record<Region, number>> {
  await initDb();
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT region, COUNT(*)::int AS cnt FROM stores GROUP BY region"
  );
  const out: Record<Region, number> = { USA: 0, CAD: 0, EU: 0, UK: 0 };
  for (const row of rows) {
    if (row.region in out) out[row.region as Region] = Number(row.cnt);
  }
  return out;
}
