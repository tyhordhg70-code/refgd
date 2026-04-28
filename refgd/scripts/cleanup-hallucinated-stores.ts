/**
 * Reconcile the production stores table with refgd/data/stores.json,
 * which is the authoritative parsed snapshot of the original
 * refundgod.io store list.
 *
 * Removes any store row whose `id` is not present in the JSON.
 * Idempotent — safe to run repeatedly.
 *
 * Usage: tsx refgd/scripts/cleanup-hallucinated-stores.ts
 */
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const cs = process.env.NEON_DATABASE_URL || process.env.RENDER_DATABASE_URL;
if (!cs) {
  console.error("Missing NEON_DATABASE_URL / RENDER_DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 2 });

(async () => {
  const file = path.resolve(process.cwd(), "data/stores.json");
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw) as Array<{ id: string }>;
  const allowed = new Set(data.map((s) => s.id));
  console.log(`Authoritative store count from JSON: ${allowed.size}`);

  const { rows: dbRows } = await pool.query<{ id: string; name: string; region: string }>(
    "SELECT id, name, region FROM stores",
  );
  console.log(`Current DB row count: ${dbRows.length}`);

  const toDelete = dbRows.filter((r) => !allowed.has(r.id));
  console.log(`Rows to delete (not in JSON): ${toDelete.length}`);
  for (const r of toDelete) {
    console.log(`  - ${r.region}\t${r.name}\t(id=${r.id})`);
  }

  if (toDelete.length === 0) {
    console.log("Nothing to clean. Done.");
    await pool.end();
    return;
  }

  const ids = toDelete.map((r) => r.id);
  const { rowCount } = await pool.query("DELETE FROM stores WHERE id = ANY($1::text[])", [ids]);
  console.log(`Deleted ${rowCount} rows.`);

  const { rows: after } = await pool.query<{ region: string; c: number }>(
    "SELECT region, COUNT(*)::int AS c FROM stores GROUP BY region ORDER BY region",
  );
  console.log("Remaining by region:", after);
  const { rows: total } = await pool.query<{ c: number }>("SELECT COUNT(*)::int AS c FROM stores");
  console.log("Remaining total:", total[0].c);

  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
