/**
 * Seeds the Render PostgreSQL database from data/stores.json.
 * Idempotent — uses INSERT … ON CONFLICT DO UPDATE.
 *
 *   npm run seed          # upsert all stores from stores.json
 *   npm run seed -- --reset   # DELETE all stores first, then upsert
 */
import fs from "node:fs";
import path from "node:path";

// Load .env so DATABASE_URL / SESSION_SECRET are available in local dev
// (Replit injects secrets automatically; this only matters for bare `tsx` runs)
const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

import { initDb, getPool } from "../lib/db";
import { upsertStore } from "../lib/stores";
import type { Store } from "../lib/types";

async function main() {
  const reset = process.argv.includes("--reset");

  console.log("[seed] connecting to Postgres …");
  await initDb();
  const pool = getPool();

  if (reset) {
    await pool.query("DELETE FROM stores");
    console.log("[seed] reset: cleared stores");
  }

  const file = path.join(__dirname, "..", "data", "stores.json");
  if (!fs.existsSync(file)) {
    console.error("[seed] stores.json not found. Run `npm run parse-stores` first.");
    process.exit(1);
  }
  const stores: Store[] = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log(`[seed] upserting ${stores.length} stores …`);
  let count = 0;
  for (const s of stores) {
    await upsertStore(s);
    count++;
    if (count % 50 === 0) console.log(`  … ${count}/${stores.length}`);
  }

  console.log(`[seed] done — ${count} stores upserted into Postgres`);
  await pool.end();
}

main().catch((e) => {
  console.error("[seed] error:", e);
  process.exit(1);
});
