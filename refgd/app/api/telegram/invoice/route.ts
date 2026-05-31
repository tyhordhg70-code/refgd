import { NextResponse } from "next/server";
import { getProduct } from "@/lib/shop-catalog";
import { createOrder, newDeliveryToken } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/invoice
 *
 * Creates a pending order and a Telegram Stars invoice link (currency XTR).
 *
 * markupPct (optional, 0–1): fractional markup applied on top of the Stars
 * price. Pass 0.25 for Apple/Google Pay (25% platform commission) or 0 for
 * card payments via Telegram Web (no app-store fee).
 *
 * Stars base rate: 50 Stars ≈ $1 USD.
 * After markup: stars = ceil(price × 50 × (1 + markupPct)).
 *
 * Required env: TELEGRAM_BOT_TOKEN
 */

const STARS_PER_USD = 50;

/** Telegram's fixed Star-purchase package tiers (as of 2025). */
const STAR_PACKAGES = [50, 75, 100, 150, 200, 250, 350, 500, 750, 1000, 1500, 2500, 5000];

/**
 * Round Stars up to the nearest Telegram package boundary so the user
 * can buy exactly one package to cover the invoice — no overshooting.
 */
function snapToPackage(stars: number): number {
  const pkg = STAR_PACKAGES.find((p) => p >= stars);
  if (pkg !== undefined) return pkg;
  return Math.ceil(stars / 500) * 500;
}

type Body = {
  productId: string;
  customFields?: Record<string, string>;
  /** Fractional markup, e.g. 0.25 = 25 %. Clamped 0–1. Defaults to 0. */
  markupPct?: number;
};

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

  const markupPct = Math.max(0, Math.min(1, body.markupPct ?? 0));
  const orderId = `refgd_${product.id}_xtr_${Date.now().toString(36)}`;
  const token = newDeliveryToken();
  const rawStars = Math.max(1, Math.ceil(product.price * STARS_PER_USD * (1 + markupPct)));
  const stars = snapToPackage(rawStars);

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
        provider_token: "",
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
    markupPct,
    accessUrl: `${origin}/access/${token}`,
  });
}
