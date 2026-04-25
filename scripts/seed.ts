/**
 * Seeds the SQLite database from data/stores.json.
 * Idempotent: skips stores that already exist by id.
 *
 *   npm run seed         # only inserts new
 *   npm run seed -- --reset   # wipes & reseeds
 */
import fs from "node:fs";
import path from "node:path";
import { db, withDb } from "../lib/db";
import { upsertStore } from "../lib/stores";
import { ensureBootstrapAdmin } from "../lib/auth";
import type { Store } from "../lib/types";

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    withDb((d) => { d.stores = {}; });
    console.log("[seed] reset: cleared stores");
  }

  const file = path.join(__dirname, "..", "data", "stores.json");
  if (!fs.existsSync(file)) {
    console.error("[seed] stores.json not found. Run `npm run parse-stores` first.");
    process.exit(1);
  }
  const stores: Store[] = JSON.parse(fs.readFileSync(file, "utf8"));

  let inserted = 0;
  let skipped = 0;
  const existing = new Set(Object.keys(db().stores));
  for (const s of stores) {
    if (!reset && existing.has(s.id)) {
      skipped++;
      continue;
    }
    upsertStore(s);
    inserted++;
  }

  await ensureBootstrapAdmin();
  console.log(`[seed] inserted ${inserted}, skipped ${skipped}`);
  console.log("[seed] admin bootstrap OK (uses ADMIN_USERNAME / ADMIN_PASSWORD)");
  // give the async write queue a moment to flush
  await new Promise((r) => setTimeout(r, 250));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
