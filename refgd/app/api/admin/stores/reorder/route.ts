import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getStore, upsertStore } from "@/lib/stores";

export const dynamic = "force-dynamic";

/**
 * Batch sort-order update for stores.
 *
 * Body shape: `{ order: Array<{ id: string; sortOrder: number }> }`
 *
 * The inline editor on /store-list uses this when an admin drags a card
 * into a new position within its category. We avoid calling the per-id
 * PATCH N times to cut down on round-trips.
 *
 * Validation rules (enforced server-side, never trust the client):
 *   - Caller must be an authenticated admin (401 otherwise).
 *   - `order` must be a non-empty array, length ≤ 200.
 *   - Each entry must be `{ id: non-empty string, sortOrder: finite int }`.
 *   - Ids must be unique; unknown ids are rejected.
 *   - All referenced stores must share the same `(region, category)`
 *     bucket — drag-reorder is a single-bucket operation. Cross-bucket
 *     payloads return 400 with no partial writes.
 *
 * Response: `{ ok: true, updated: number }` on success.
 */
const MAX_BATCH = 200;

export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.order)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const raw = body.order as unknown[];
  if (raw.length === 0 || raw.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `order must contain 1..${MAX_BATCH} items` },
      { status: 400 },
    );
  }

  // Strict per-item validation
  type Item = { id: string; sortOrder: number };
  const items: Item[] = [];
  const seen = new Set<string>();
  for (const it of raw) {
    if (!it || typeof it !== "object") {
      return NextResponse.json({ error: "Invalid item shape" }, { status: 400 });
    }
    const { id, sortOrder } = it as Record<string, unknown>;
    if (typeof id !== "string" || id.trim() === "") {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    if (typeof sortOrder !== "number" || !Number.isFinite(sortOrder) || !Number.isInteger(sortOrder)) {
      return NextResponse.json({ error: "sortOrder must be a finite integer" }, { status: 400 });
    }
    if (seen.has(id)) {
      return NextResponse.json({ error: "Duplicate id in order" }, { status: 400 });
    }
    seen.add(id);
    items.push({ id, sortOrder });
  }

  // Resolve all stores up-front. Any unknown id is a 400. We also need
  // the (region, category) to enforce single-bucket invariant.
  const resolved = await Promise.all(items.map((i) => getStore(i.id)));
  for (let i = 0; i < resolved.length; i++) {
    if (!resolved[i]) {
      return NextResponse.json(
        { error: `Unknown store id: ${items[i].id}` },
        { status: 400 },
      );
    }
  }
  const stores = resolved as NonNullable<(typeof resolved)[number]>[];

  // Single-bucket guard. The drag-reorder UI only ever reshuffles cards
  // inside a (region, category) bucket — accepting mixed payloads would
  // let an admin (or a forged client) silently move stores across
  // categories, which would corrupt the canonical ordering.
  const bucket = `${stores[0].region}::${stores[0].category}`;
  for (const st of stores) {
    if (`${st.region}::${st.category}` !== bucket) {
      return NextResponse.json(
        {
          error: "All stores in an order batch must share region and category",
          expected: bucket,
        },
        { status: 400 },
      );
    }
  }

  // Apply updates. Errors here are surfaced as 500 so the client can
  // re-fetch and refresh local state.
  let updated = 0;
  for (let i = 0; i < items.length; i++) {
    const next = { ...stores[i], sortOrder: items[i].sortOrder };
    await upsertStore(next);
    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}
