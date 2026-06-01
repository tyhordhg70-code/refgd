import { NextResponse } from "next/server";
import { getProduct } from "@/lib/shop-catalog";
import { createOrder, newDeliveryToken } from "@/lib/delivery";
import { STARS_PER_USD, splitStars, partId, maxStarsForMethod } from "@/lib/stars-split";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/invoice
 *
 * Creates the Telegram Stars invoice link(s) for a product.
 *
 * Telegram caps how many Stars a buyer can spend per transaction, depending on
 * the pay method (mobile IAP 35 000, desktop/web 150 000). An order over the
 * relevant cap is split into as many parts as needed that SUM to the full price
 * (see lib/stars-split.ts). Most orders fit in a single invoice; e.g. a $700
 * product is one 35 000-Star invoice on mobile, and a $3 000 product is one
 * 150 000-Star invoice on desktop/web.
 *
 * Markup (Apple / Google Pay) is folded into the total before splitting, so
 * the buyer always covers the full cost plus the platform fee.
 *
 * Stars base rate: 50 Stars ≈ $1 USD.
 *
 * Required env: TELEGRAM_BOT_TOKEN
 */

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
  /**
   * Checkout method — sets the per-invoice Stars cap:
   *   "app"  → Apple / Google Pay (mobile IAP, 35 000 cap)
   *   "card" → Telegram Web / Desktop (150 000 cap)
   * Defaults to "card" (higher cap = fewer steps). If omitted, inferred from
   * markupPct (>0 implies the 25 % app-pay path).
   */
  method?: "app" | "card";
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
  // Method sets the per-invoice cap (mobile IAP 35k vs desktop/web 150k).
  // Fall back to inferring it from the markup if the client didn't send it.
  const method: "app" | "card" = body.method ?? (markupPct > 0 ? "app" : "card");
  const maxPerInvoice = maxStarsForMethod(method);

  // Full Stars total (price + any platform-fee markup), then split into parts
  // that each fit under this method's single-invoice cap and SUM to this total.
  const totalStars = Math.max(1, Math.ceil(product.price * STARS_PER_USD * (1 + markupPct)));
  const starsParts = splitStars(totalStars, maxPerInvoice);
  const total = starsParts.length;
  const split = total > 1;

  const ts = Date.now().toString(36);
  const base = `refgd_${product.id}_xtr_${ts}`;

  const fieldLines = Object.entries(body.customFields ?? {})
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const description = [product.title, fieldLines].filter(Boolean).join(" — ").slice(0, 255);

  const origin =
    req.headers.get("origin") ??
    `https://${req.headers.get("host") ?? "refgd.onrender.com"}`;

  // Create one pending order per part. Part 1 carries the real delivery token
  // (the access page + final delivery key off it); later parts just collect the
  // remaining Stars. We keep the buyer's custom fields/price on every part so
  // the admin orders view stays consistent with the previous behaviour.
  const ids = starsParts.map((_, i) => partId(base, i + 1, total));
  const tokens = starsParts.map(() => newDeliveryToken());
  const firstId = ids[0];
  const firstToken = tokens[0];

  try {
    for (let i = 0; i < ids.length; i++) {
      await createOrder({
        id: ids[i],
        productId: product.id,
        productTitle: product.title,
        price: product.price,
        currency: product.currency ?? "USD",
        customFields: body.customFields ?? {},
        channel: "telegram",
        email: null,
        telegramHandle: null,
        deliveryToken: tokens[i],
        invoiceId: null,
      });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Could not create order", detail: String(e) },
      { status: 500 },
    );
  }

  const titleBase = product.title.slice(0, 22);
  const invoiceUrls: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const title = split ? `${titleBase} (${i + 1}/${total})` : product.title;
    const url = await makeTgInvoiceLink(botToken, title, description, ids[i], starsParts[i]);
    if (!url) {
      // Part 1 must succeed — without it checkout cannot start.
      if (i === 0) {
        return NextResponse.json(
          { ok: false, error: "Failed to create Telegram Stars invoice" },
          { status: 502 },
        );
      }
      // A later part failed: stop rather than ship a short-paying order.
      return NextResponse.json(
        { ok: false, error: `Failed to create Telegram Stars invoice (part ${i + 1})` },
        { status: 502 },
      );
    }
    invoiceUrls.push(url);
  }

  return NextResponse.json({
    ok: true,
    orderId: firstId,
    invoiceUrls,
    starsParts,
    totalStars,
    totalParts: total,
    split,
    markupPct,
    // Back-compat fields for older clients.
    invoiceUrl: invoiceUrls[0],
    invoiceUrl2: invoiceUrls[1],
    stars: starsParts[0],
    stars2: starsParts[1],
    accessUrl: `${origin}/access/${firstToken}`,
  });
}
