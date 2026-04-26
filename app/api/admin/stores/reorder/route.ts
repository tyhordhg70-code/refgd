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
 */
export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.order)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let updated = 0;
  for (const item of body.order as Array<{ id: string; sortOrder: number }>) {
    if (typeof item?.id !== "string" || typeof item?.sortOrder !== "number") continue;
    const existing = await getStore(item.id);
    if (!existing) continue;
    await upsertStore({ ...existing, sortOrder: item.sortOrder });
    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}
