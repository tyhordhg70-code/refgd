import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getShopCatalog } from "@/lib/shop-catalog";
import {
  listProductDeliveries,
  upsertProductDelivery,
  getProductDelivery,
  type DeliveryType,
} from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAuth() {
  const s = await readSession();
  return s ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** GET — all products (id/title/image) + their delivery configs. */
export async function GET() {
  const u = await requireAuth();
  if (u) return u;

  const cat = await getShopCatalog();
  const seen = new Map<string, { id: string; title: string; image: string | null }>();
  for (const c of cat.categories) {
    for (const p of c.products) {
      if (!seen.has(p.id)) seen.set(p.id, { id: p.id, title: p.title, image: p.image });
    }
  }
  const deliveries = await listProductDeliveries();
  return NextResponse.json({ products: Array.from(seen.values()), deliveries });
}

/** POST — upsert one product's delivery config. */
export async function POST(req: Request) {
  const u = await requireAuth();
  if (u) return u;

  const b = await req.json().catch(() => null);
  if (!b || typeof b.productId !== "string" || !b.productId.trim()) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }
  const type: DeliveryType = b.type === "text" ? "text" : "link";
  await upsertProductDelivery({
    productId: b.productId,
    enabled: Boolean(b.enabled),
    type,
    content: String(b.content ?? ""),
    buttonLabel: String(b.buttonLabel ?? "Access your product"),
    message: String(b.message ?? ""),
    deliveryTime: String(b.deliveryTime ?? "Instant"),
  });
  const saved = await getProductDelivery(b.productId);
  return NextResponse.json({ ok: true, delivery: saved });
}
