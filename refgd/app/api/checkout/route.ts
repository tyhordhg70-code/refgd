import { NextResponse } from "next/server";
  import { getProduct } from "@/lib/shop-catalog";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  type Body = {
    productId: string;
    customFields?: Record<string, string>;
    email?: string;
  };

  /**
   * POST /api/checkout
   *
   * Creates a NowPayments invoice for one of the shop products (DB-backed)
   * and returns the hosted invoice_url for inline iframe embed.
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

    const orderId = `refgd_${product.id}_${Date.now().toString(36)}`;
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

    const npBody = {
      price_amount: product.price,
      price_currency: (product.currency ?? "USD").toLowerCase(),
      order_id: orderId,
      order_description: description.slice(0, 240),
      success_url: `${origin}/shop-methods?checkout=success&order=${orderId}`,
      cancel_url: `${origin}/shop-methods?checkout=cancel&order=${orderId}`,
      is_fee_paid_by_user: false,
      is_fixed_rate: false,
      ...(body.email ? { customer_email: body.email } : {}),
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
    try { json = JSON.parse(raw); } catch {
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
    });
  }
  