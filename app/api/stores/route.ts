import { NextResponse } from "next/server";
import { listStores } from "@/lib/stores";
import type { Region } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_REGIONS = new Set<Region>(["USA", "CAD", "EU", "UK"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const regionParam = url.searchParams.get("region") as Region | null;
  const region = regionParam && VALID_REGIONS.has(regionParam) ? regionParam : undefined;
  const search = url.searchParams.get("q") ?? undefined;
  const stores = listStores({ region, search });
  return NextResponse.json({ stores, count: stores.length });
}
