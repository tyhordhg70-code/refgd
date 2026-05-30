import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getOrder, listOrders, markOrderPaid } from "@/lib/delivery";
import { deliverOrder, publicBaseUrl } from "@/lib/deliver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAuth() {
  const s = await readSession();
  return s ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** GET — recent orders for the deliveries dashboard. */
export async function GET() {
  const u = await requireAuth();
  if (u) return u;
  const orders = await listOrders(100);
  return NextResponse.json({ orders });
}

/**
 * POST — manually (re)deliver an order. Body: { orderId, resend? }.
 * If the order is still pending it is marked paid (admin override) first.
 */
export async function POST(req: Request) {
  const u = await requireAuth();
  if (u) return u;

  const b = await req.json().catch(() => null);
  const orderId = b?.orderId ? String(b.orderId) : "";
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: "Unknown order" }, { status: 404 });

  if (order.status === "pending") await markOrderPaid(orderId, "admin_override");
  const fresh = await getOrder(orderId);
  if (!fresh) return NextResponse.json({ error: "Order vanished" }, { status: 404 });

  const baseUrl = publicBaseUrl(`https://${req.headers.get("host") ?? ""}`);
  const result = await deliverOrder(fresh, baseUrl, { force: Boolean(b?.resend) });
  return NextResponse.json({ ok: true, result });
}
