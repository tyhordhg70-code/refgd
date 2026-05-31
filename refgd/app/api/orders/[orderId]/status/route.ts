import { NextResponse } from "next/server";
import { getOrder } from "@/lib/delivery";
import { publicBaseUrl } from "@/lib/deliver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[orderId]/status
 *
 * Lightweight polling endpoint for the invoice monitor page.
 * Returns the order's current status plus split-payment state.
 *
 * For split Stars payments the caller always passes the Part-1 orderId.
 * This route derives the Part-2 ID (by swapping "_xtr_" → "_xtr2_") and
 * includes its status so the frontend can show step-by-step progress.
 *
 * The deliveryToken (and therefore accessUrl) is only returned once the
 * order is fully paid — not while still awaiting Part 2.
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

  const baseUrl = publicBaseUrl(
    `https://${new URL(req.url).host}`,
  );

  // ── Split-payment detection ──────────────────────────────────────────────
  // Part-1 IDs contain "_xtr_" (underscore on both sides of "xtr").
  // Part-2 IDs contain "_xtr2_" — "_xtr_" is NOT a substring of "_xtr2_"
  // because the character after "r" is "2", not "_".
  let awaitingPart2 = false;
  let part2Status: string | undefined;

  const isPart1Stars = orderId.includes("_xtr_");
  if (isPart1Stars) {
    const part2Id = orderId.replace("_xtr_", "_xtr2_");
    const part2 = await getOrder(part2Id);
    if (part2) {
      const p2paid = part2.status === "paid" || part2.status === "delivered";
      part2Status = part2.status;
      awaitingPart2 = !p2paid && (order.status === "paid" || order.status === "delivered");
    }
  }

  // ── Build response ───────────────────────────────────────────────────────
  const fullyPaid =
    (order.status === "paid" || order.status === "delivered") && !awaitingPart2;

  const accessUrl = fullyPaid
    ? `${baseUrl}/access/${order.deliveryToken}`
    : undefined;

  return NextResponse.json({
    ok: true,
    status: order.status,
    productTitle: order.productTitle,
    createdAt: order.createdAt,
    accessUrl,
    awaitingPart2,
    part2Status,
  });
}
