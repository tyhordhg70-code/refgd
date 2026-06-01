import { NextResponse } from "next/server";
import { getOrder } from "@/lib/delivery";
import { publicBaseUrl } from "@/lib/deliver";
import { siblingIds, partInfo, firstPartId } from "@/lib/stars-split";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[orderId]/status
 *
 * Polling endpoint for the invoice monitor page. Always called with the
 * Part-1 orderId. For multi-part Stars orders it derives every sibling part
 * (see lib/stars-split.ts) and reports each part's pay state so the frontend
 * can show step-by-step progress.
 *
 * The accessUrl (and therefore delivery) is only returned once EVERY part is
 * paid — never while any part is still outstanding.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const baseUrl = publicBaseUrl(`https://${new URL(req.url).host}`);

  const { total } = partInfo(orderId);
  const ids = siblingIds(orderId);

  // Fetch every part and record its pay state in order.
  const partOrders = await Promise.all(ids.map((id) => getOrder(id)));
  const isPaid = (s?: string) => s === "paid" || s === "delivered";
  const parts = partOrders.map((o, i) => ({
    index: i + 1,
    status: o?.status ?? "pending",
    paid: isPaid(o?.status),
  }));
  const paidCount = parts.filter((p) => p.paid).length;
  const fullyPaid = paidCount === total && total > 0;

  // Delivery is keyed off Part 1's token.
  const first = orderId === firstPartId(orderId) ? order : partOrders[0];
  const accessUrl = fullyPaid && first
    ? `${baseUrl}/access/${first.deliveryToken}`
    : undefined;

  // Back-compat fields (older cached clients still read these).
  const part2 = parts[1];
  const awaitingPart2 = total > 1 && isPaid(order.status) && !fullyPaid;

  return NextResponse.json({
    ok: true,
    status: order.status,
    productTitle: order.productTitle,
    createdAt: order.createdAt,
    accessUrl,
    totalParts: total,
    paidCount,
    fullyPaid,
    parts,
    awaitingPart2,
    part2Status: part2?.status,
  });
}
