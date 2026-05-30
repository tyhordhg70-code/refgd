import { NextResponse } from "next/server";
import { getProduct } from "@/lib/shop-catalog";
import { createOrder, newDeliveryToken } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/invoice
 *
 * Creates a pending order and a Telegram Stars invoice link (currency XTR).
 * The client immediately redirects the buyer to the returned t.me/$ URL.
 * After the buyer pays inside Telegram, the bot webhook receives
 * successful_payment, marks the order paid, and auto-delivers the product.
 *
 * Stars pricing: ~50 Stars ≈ $1 USD (Telegram's standard retail rate).
 * Note: Telegram takes a 30% cut of Stars revenue.
 *
 * Required env: TELEGRAM_BOT_TOKEN
 * Bot must have Stars payments enabled (enable via @BotFather → /mybots →
 * Payments → Telegram Stars if prompted, though most bots support it by default).
 */

const STARS_PER_USD = 50;

type Body = { productId: string; customFields?: Record<string, string> };

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { ok: false, error: "Telegram Stars checkout is not configured." },
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

  const orderId = `refgd_${product.id}_xtr_${Date.now().toString(36)}`;
  const token = newDeliveryToken();
  const stars = Math.max(1, Math.ceil(product.price * STARS_PER_USD));

  const fieldLines = Object.entries(body.customFields ?? {})
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const description = [product.title, fieldLines].filter(Boolean).join(" — ").slice(0, 255);

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
      channel: "telegram",
      email: null,
      telegramHandle: null,
      deliveryToken: token,
      invoiceId: null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Could not create order", detail: String(e) },
      { status: 500 },
    );
  }

  const tgRes = await fetch(
    `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: product.title.slice(0, 32),
        description: (description || product.title).slice(0, 255),
        payload: orderId,
        currency: "XTR",
        prices: [{ label: product.title.slice(0, 32), amount: stars }],
      }),
      cache: "no-store",
    },
  );

  const tgJson = (await tgRes.json()) as {
    ok: boolean;
    result?: string;
    description?: string;
  };

  if (!tgJson.ok || !tgJson.result) {
    return NextResponse.json(
      {
        ok: false,
        error: tgJson.description ?? "Failed to create Telegram Stars invoice",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    invoiceUrl: tgJson.result,
    orderId,
    stars,
    accessUrl: `${origin}/access/${token}`,
  });
}
