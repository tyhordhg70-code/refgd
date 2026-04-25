import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { listStores, upsertStore } from "@/lib/stores";
import { guessDomain } from "@/lib/logo";
import type { Store, StoreCategory, Region, StoreTag } from "@/lib/types";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const REGIONS = new Set<Region>(["USA", "CAD", "EU", "UK"]);
const CATS = new Set<StoreCategory>([
  "Electronics", "Clothing", "Jewelry", "Food", "Meal Plans", "Home", "Other",
]);
const TAGS = new Set<StoreTag>(["fire", "diamond", "crown", "global", "new"]);

async function requireAuth(): Promise<NextResponse | null> {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET() {
  const u = await requireAuth();
  if (u) return u;
  return NextResponse.json({ stores: listStores() });
}

export async function POST(req: Request) {
  const u = await requireAuth();
  if (u) return u;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const region = REGIONS.has(body.region) ? (body.region as Region) : "USA";
  const category = CATS.has(body.category) ? (body.category as StoreCategory) : "Other";
  const tags = Array.isArray(body.tags)
    ? (body.tags as string[]).filter((t): t is StoreTag => TAGS.has(t as StoreTag))
    : [];
  const now = new Date().toISOString();
  const id = body.id || crypto.randomUUID();
  const domain = body.domain || (body.name ? guessDomain(body.name) : null);

  const store: Store = {
    id,
    name: String(body.name ?? "").trim(),
    domain: domain ? String(domain).trim() : null,
    region,
    category,
    priceLimit: body.priceLimit ? String(body.priceLimit) : null,
    itemLimit: body.itemLimit ? String(body.itemLimit) : null,
    fee: body.fee ? String(body.fee) : null,
    timeframe: body.timeframe ? String(body.timeframe) : null,
    notes: body.notes ? String(body.notes) : null,
    tags,
    prismaticGlow: Boolean(body.prismaticGlow),
    logoUrl: body.logoUrl ? String(body.logoUrl) : null,
    rawText: body.rawText ? String(body.rawText) : null,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 1000,
    createdAt: now,
    updatedAt: now,
  };
  if (!store.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const saved = upsertStore(store);
  return NextResponse.json({ store: saved });
}
