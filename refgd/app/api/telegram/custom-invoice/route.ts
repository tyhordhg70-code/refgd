import { NextResponse } from "next/server";
import { createOrder, newDeliveryToken } from "@/lib/delivery";
import {
  STARS_PER_USD,
  splitStars,
  partId,
  maxStarsForMethod,
} from "@/lib/stars-split";
import { getCurrency, toUsd } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/custom-invoice
 *
 * Creates Telegram Stars invoice link(s) for a customer-priced order.
 * Identical splitting logic to /api/telegram/invoice — see that route
 * and lib/stars-split.ts for full documentation.
 *
 * Body:
 *   amountUsd  — customer-entered price in USD (required, > 0)
 *   title      — display title (optional, default "Custom Order")
 *   note       — buyer note (optional)
 *   markupPct  — fractional platform-fee markup, e.g. 0.25 (default 0)
 *   method     — "app" (Apple/Google Pay, 35k cap) | "card" (Telegram Web, 150k cap)
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
  const j = (await res.json()) as {
    ok: boolean;
    result?: string;
    description?: string;
  };
  return j.ok && j.result ? j.result : null;
}

type Body = {
  /** Pre-converted USD value (fallback when amount+currency absent). */
  amountUsd?: number;
  /** Amount in the buyer's chosen currency. */
  amount?: number;
  /** ISO currency code, e.g. "USD", "GBP". Defaults to USD. */
  currency?: string;
  title?: string;
  note?: string;
  markupPct?: number;
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
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Resolve the USD amount used for Stars pricing. Prefer the original
  // amount + currency (converted here so the server is the source of
  // truth) and fall back to a pre-converted amountUsd for back-compat.
  const cur = getCurrency(body.currency || "USD");
  const rawAmount = Number(body.amount);
  const hasNative = isFinite(rawAmount) && rawAmount > 0;
  const amountUsd = hasNative ? toUsd(rawAmount, cur.code) : Number(body.amountUsd);
  // Mirror the client's $1 USD-equivalent floor here — this endpoint is public,
  // so a direct POST must not be able to create sub-$1 (underpriced) invoices.
  if (!isFinite(amountUsd) || amountUsd < 1) {
    return NextResponse.json(
      {
        ok: false,
        error: "Amount must be at least $1 USD (or equivalent in the selected currency)",
      },
      { status: 400 },
    );
  }

  // Human-readable price label for the invoice description / order record.
  const priceLabel =
    cur.code === "USD" || !hasNative
      ? `$${amountUsd.toFixed(2)}`
      : `${cur.symbol}${rawAmount.toFixed(2)} ${cur.code} (≈ $${amountUsd.toFixed(2)})`;

  const title = (body.title?.trim() || "Custom Order").slice(0, 80);
  const note = body.note?.trim() ?? "";
  const markupPct = Math.max(0, Math.min(1, body.markupPct ?? 0));
  const method: "app" | "card" =
    body.method ?? (markupPct > 0 ? "app" : "card");
  const maxPerInvoice = maxStarsForMethod(method);

  const totalStars = Math.max(
    1,
    Math.ceil(amountUsd * STARS_PER_USD * (1 + markupPct)),
  );
  const starsParts = splitStars(totalStars, maxPerInvoice);
  const total = starsParts.length;
  const split = total > 1;

  const ts = Date.now().toString(36);
  const base = `refgd_custom_xtr_${ts}`;

  const description = [title, priceLabel, note].filter(Boolean).join(" — ").slice(0, 255);
  const customFields: Record<string, string> = {};
  if (note) customFields.note = note;
  if (hasNative && cur.code !== "USD") {
    customFields.currency = cur.code;
    customFields.amount = String(rawAmount);
  }
  const origin =
    req.headers.get("origin") ??
    `https://${req.headers.get("host") ?? "refgd.onrender.com"}`;

  const ids = starsParts.map((_, i) => partId(base, i + 1, total));
  const tokens = starsParts.map(() => newDeliveryToken());
  const firstId = ids[0];
  const firstToken = tokens[0];

  try {
    for (let i = 0; i < ids.length; i++) {
      await createOrder({
        id: ids[i],
        productId: "custom-order",
        productTitle: title,
        price: amountUsd,
        currency: "USD",
        customFields,
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

  const titleBase = title.slice(0, 22);
  const invoiceUrls: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const tgTitle = split ? `${titleBase} (${i + 1}/${total})` : title;
    const url = await makeTgInvoiceLink(
      botToken,
      tgTitle,
      description,
      ids[i],
      starsParts[i],
    );
    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to create Telegram Stars invoice${split ? ` (part ${i + 1})` : ""}`,
        },
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
    invoiceUrl: invoiceUrls[0],
    accessUrl: `${origin}/access/${firstToken}`,
  });
}
