import { NextResponse } from "next/server";
import { getProduct } from "@/lib/shop-catalog";
import { createOrder, newDeliveryToken } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/invoice
 *
 * Creates one or two Telegram Stars invoice links for a product.
 *
 * Split logic:
 *   - If total Stars ≤ 5 000 (max single Telegram package): one invoice.
 *   - If total Stars > 5 000: two invoices — first is always 5 000 Stars,
 *     second is the remainder snapped to the nearest package.
 *
 * Rounding direction:
 *   - markupPct > 0 (Apple / Google Pay): snap UP so the user buys the
 *     next available package — they will always cover the full cost.
 *   - markupPct = 0 (Credit / Debit Card): snap DOWN so the user is never
 *     charged more than the product price.
 *
 * Stars base rate: 50 Stars ≈ $1 USD.
 *
 * Required env: TELEGRAM_BOT_TOKEN
 */

const STARS_PER_USD = 50;
const MAX_SINGLE_STARS = 5000;

/** Telegram Stars purchase tiers (as of 2025). */
const STAR_PACKAGES = [50, 75, 100, 150, 200, 250, 350, 500, 750, 1000, 1500, 2500, 5000];

/** Snap UP to nearest package boundary (Apple / Google Pay). */
function snapUp(stars: number): number {
  const pkg = STAR_PACKAGES.find((p) => p >= stars);
  return pkg ?? MAX_SINGLE_STARS;
}

/** Snap DOWN to nearest package boundary (Card / Telegram Web). */
function snapDown(stars: number): number {
  let best = STAR_PACKAGES[0];
  for (const p of STAR_PACKAGES) {
    if (p <= stars) best = p;
    else break;
  }
  return best;
}

async function makeTgInvoiceLink(
  botToken: string,
  title: string,
  description: string,
  payload: string,
  stars: number,
): Promise<string | null> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.slice(0, 32),
        description: description.slice(0, 255),
        payload,
        provider_token: "",
        currency: "XTR",
        prices: [{ label: title.slice(0, 32), amount: stars }],
      }),
      cache: "no-store",
    },
  );
  const j = (await res.json()) as { ok: boolean; result?: string; description?: string };
  return j.ok && j.result ? j.result : null;
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
  const roundUp = markupPct > 0; // Apple/Google Pay rounds up; card rounds down
  const snap = roundUp ? snapUp : snapDown;

  const rawStars = Math.max(1, Math.ceil(product.price * STARS_PER_USD * (1 + markupPct)));
  const needsSplit = rawStars > MAX_SINGLE_STARS;

  const stars1 = needsSplit ? MAX_SINGLE_STARS : snap(rawStars);
  const stars2 = needsSplit ? snap(rawStars - MAX_SINGLE_STARS) : null;

  const ts = Date.now().toString(36);
  const orderId1 = `refgd_${product.id}_xtr_${ts}`;
  const orderId2 = needsSplit ? `refgd_${product.id}_xtr2_${ts}` : null;
  const token1 = newDeliveryToken();
  const token2 = needsSplit ? newDeliveryToken() : null;

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
      id: orderId1,
      productId: product.id,
      productTitle: product.title,
      price: product.price,
      currency: product.currency ?? "USD",
      customFields: body.customFields ?? {},
      channel: "telegram",
      email: null,
      telegramHandle: null,
      deliveryToken: token1,
      invoiceId: null,
    });
    if (needsSplit && orderId2 && token2) {
      await createOrder({
        id: orderId2,
        productId: product.id,
        productTitle: product.title,
        price: product.price,
        currency: product.currency ?? "USD",
        customFields: body.customFields ?? {},
        channel: "telegram",
        email: null,
        telegramHandle: null,
        deliveryToken: token2,
        invoiceId: null,
      });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Could not create order", detail: String(e) },
      { status: 500 },
    );
  }

  const title1 = needsSplit
    ? `${product.title.slice(0, 27)} (1/2)`
    : product.title;
  const title2 = `${product.title.slice(0, 27)} (2/2)`;

  const url1 = await makeTgInvoiceLink(botToken, title1, description, orderId1, stars1);
  if (!url1) {
    return NextResponse.json(
      { ok: false, error: "Failed to create Telegram Stars invoice" },
      { status: 502 },
    );
  }

  let url2: string | null = null;
  if (needsSplit && orderId2 && stars2) {
    url2 = await makeTgInvoiceLink(botToken, title2, description, orderId2, stars2);
  }

  return NextResponse.json({
    ok: true,
    invoiceUrl: url1,
    invoiceUrl2: url2 ?? undefined,
    orderId: orderId1,
    stars: stars1,
    stars2: stars2 ?? undefined,
    split: needsSplit,
    markupPct,
    accessUrl: `${origin}/access/${token1}`,
  });
}
