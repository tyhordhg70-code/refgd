import { NextResponse } from "next/server";
  import catalog from "@/data/shop-methods.json";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  type Product = {
    id: string;
    title: string;
    price: number;
    currency?: string;
    customFields?: { name: string; required: boolean }[];
  };

  type Body = {
    productId: string;
    customFields?: Record<string, string>;
    email?: string;
  };

  /**
   * POST /api/checkout
   *
   * Creates a NowPayments invoice for one of the products in
   * /data/shop-methods.json and returns its hosted `invoice_url` so the
   * client can embed it in an iframe (no full-page redirect).
   *
   * Body:
   *   { productId: "evasion-book---level-1",
   *     customFields: { "Which store?": "amazon" },
   *     email?: "buyer@example.com" }
   *
   * Response:
   *   { ok: true, invoiceId, invoiceUrl }
   *
   * Required env: NOWPAYMENTS_API_KEY
   *               (optional) NOWPAYMENTS_IPN_SECRET — for /api/checkout/ipn
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

    // Look up product across all categories
    const product: Product | undefined = catalog.categories
      .flatMap((c) => c.products)
      .find((p) => p.id === body.productId) as Product | undefined;

    if (!product) {
      return NextResponse.json({ ok: false, error: "Unknown productId" }, { status: 404 });
    }

    // Validate required custom fields
    for (const cf of product.customFields ?? []) {
      if (cf.required && !body.customFields?.[cf.name]?.trim()) {
        return NextResponse.json(
          { ok: false, error: `Missing required field: ${cf.name}` },
          { status: 400 },
        );
      }
    }

    const orderId = `refgd_${product.id}_${Date.now().toString(36)}`;

    // Build a compact, human-readable order description
    const fieldLines = Object.entries(body.customFields ?? {})
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");
    const description = [product.title, fieldLines && `[${fieldLines}]`]
      .filter(Boolean)
      .join(" ");

    // Resolve absolute URLs for success / cancel callbacks
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
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
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
    });
  }
  