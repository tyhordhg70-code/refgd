import { NextResponse } from "next/server";
import { getProduct } from "@/lib/shop-catalog";
import { createOrder, newDeliveryToken, type OrderChannel } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  productId: string;
  customFields?: Record<string, string>;
  channel?: OrderChannel;
  email?: string;
  telegram?: string;
};

/**
 * POST /api/checkout
 *
 * 1. Persists a 'pending' order (with a random delivery token + the buyer's
 *    chosen delivery channel) so the NOWPayments IPN webhook can look it up and
 *    auto-deliver once payment confirms.
 * 2. Creates a NowPayments invoice wired with our ipn_callback_url and a
 *    success_url that lands the buyer on their /access/<token> delivery page.
 *
 * Required env: NOWPAYMENTS_API_KEY
 */
export async function POST(req: Request) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Checkout is not configured (missing NOWPAYMENTS_API_KEY)." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const product = await getProduct(body.productId);
  if (!product) {
    return NextResponse.json({ ok: false, error: "Unknown productId" }, { status: 404 });
  }

  for (const cf of product.customFields ?? []) {
    if (cf.required && !body.customFields?.[cf.name]?.trim()) {
      return NextResponse.json(
        { ok: false, error: `Missing required field: ${cf.name}` },
        { status: 400 },
      );
    }
  }

  const channel: OrderChannel = body.channel === "telegram" ? "telegram" : "email";
  const email = body.email?.trim() || null;
  if (channel === "email" && (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
    return NextResponse.json(
      { ok: false, error: "A valid email is required to receive your delivery." },
      { status: 400 },
    );
  }

  const orderId = `refgd_${product.id}_${Date.now().toString(36)}`;
  const token = newDeliveryToken();

  const fieldLines = Object.entries(body.customFields ?? {})
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
  const description = [product.title, fieldLines && `[${fieldLines}]`]
    .filter(Boolean)
    .join(" ");

  const origin =
    req.headers.get("origin") ??
    `https://${req.headers.get("host") ?? "refgd.onrender.com"}`;

  try {
    await createOrder({
      id: orderId,
      productId: product.id,
      productTitle: product.title,
      price: product.price,
      currency: product.currency ?? "USD",
      customFields: body.customFields ?? {},
      channel,
      email,
      telegramHandle: channel === "telegram" ? (body.telegram?.trim() || null) : null,
      deliveryToken: token,
      invoiceId: null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Could not create order", detail: String(e) },
      { status: 500 },
    );
  }

  const npBody = {
    price_amount: product.price,
    price_currency: (product.currency ?? "USD").toLowerCase(),
    order_id: orderId,
    order_description: description.slice(0, 240),
    ipn_callback_url: `${origin}/api/nowpayments/ipn`,
    success_url: `${origin}/access/${token}`,
    cancel_url: `${origin}/shop-methods?checkout=cancel&order=${orderId}`,
    is_fee_paid_by_user: false,
    is_fixed_rate: false,
    ...(email ? { customer_email: email } : {}),
  };

  let npRes: Response;
  try {
    npRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(npBody),
      cache: "no-store",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Failed to reach NowPayments", detail: String(e) },
      { status: 502 },
    );
  }

  const raw = await npRes.text();
  let json: { id?: string | number; invoice_url?: string; message?: string };
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, error: "NowPayments returned non-JSON", detail: raw.slice(0, 200) },
      { status: 502 },
    );
  }
  if (!npRes.ok || !json.invoice_url) {
    return NextResponse.json(
      {
        ok: false,
        error: json.message ?? `NowPayments error (${npRes.status})`,
        detail: raw.slice(0, 400),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    invoiceId: String(json.id ?? ""),
    invoiceUrl: json.invoice_url,
    orderId,
    token,
    accessUrl: `${origin}/access/${token}`,
  });
}
