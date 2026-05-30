import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getOrder, markOrderPaid } from "@/lib/delivery";
import { deliverOrder, publicBaseUrl } from "@/lib/deliver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recursively sort object keys (NOWPayments signs the alphabetically-sorted,
 * JSON-stringified payload with HMAC-SHA512 using the IPN secret).
 */
function sortedStringify(obj: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = sort((v as Record<string, unknown>)[k]);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(sort(obj));
}

/**
 * POST /api/nowpayments/ipn
 *
 * NOWPayments calls this when a payment changes status. We verify the HMAC
 * signature, and on a confirmed/finished payment we mark the order paid and
 * trigger auto-delivery. Fully server-side — independent of Billgang/Replit.
 *
 * Required env: NOWPAYMENTS_IPN_SECRET (from the NOWPayments dashboard).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) {
    console.error("[ipn] NOWPAYMENTS_IPN_SECRET not set — cannot verify signature; ignoring.");
    return NextResponse.json({ ok: true, skipped: "ipn secret not configured" });
  }

  const sig = req.headers.get("x-nowpayments-sig") ?? "";
  const expected = crypto
    .createHmac("sha512", secret)
    .update(sortedStringify(payload))
    .digest("hex");
  const valid =
    sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) {
    console.warn("[ipn] signature mismatch — rejecting.");
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  const orderId = String(payload.order_id ?? "");
  const status = String(payload.payment_status ?? "");
  if (!orderId) return NextResponse.json({ ok: true, note: "no order_id" });

  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ ok: true, note: "unknown order" });

  if (status === "finished" || status === "confirmed") {
    await markOrderPaid(orderId, status);
    const fresh = await getOrder(orderId);
    if (fresh) {
      const baseUrl = publicBaseUrl(
        req.headers.get("origin") ?? `https://${req.headers.get("host") ?? ""}`,
      );
      const result = await deliverOrder(fresh, baseUrl);
      if (!result.delivered) {
        console.warn(`[ipn] order ${orderId} paid but not delivered: ${result.reason}`);
      }
      return NextResponse.json({ ok: true, status, delivered: result.delivered });
    }
  }

  return NextResponse.json({ ok: true, status });
}
