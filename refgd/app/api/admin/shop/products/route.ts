import { NextResponse } from "next/server";
  import { readSession } from "@/lib/auth";
  import { getShopCatalog, upsertProduct, type ShopCustomField } from "@/lib/shop-catalog";

  export const dynamic = "force-dynamic";

  async function requireAuth() {
    const s = await readSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return null;
  }

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

  function normCustomFields(input: unknown): ShopCustomField[] {
    if (!Array.isArray(input)) return [];
    return input.map((cf) => {
      const o = (cf ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? "").slice(0, 80),
        required: Boolean(o.required),
        placeholder: typeof o.placeholder === "string" ? o.placeholder.slice(0, 160) : "",
        defaultValue: typeof o.defaultValue === "string" ? o.defaultValue.slice(0, 200) : "",
        type: typeof o.type === "string" ? o.type : "TEXT",
      };
    }).filter((cf) => cf.name);
  }

  export async function POST(req: Request) {
    const u = await requireAuth(); if (u) return u;
    const body = await req.json().catch(() => null);
    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const id = body.id ? slugify(String(body.id)) : slugify(body.title);
    if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

    const existing = await getShopCatalog();
    const validSlugs = new Set(existing.categories.map((c) => c.slug));
    const requested: string[] = Array.isArray(body.categorySlugs) ? body.categorySlugs.map(String) : [];
    const categorySlugs = requested.filter((s) => validSlugs.has(s));

    await upsertProduct({
      id,
      title: String(body.title).trim().slice(0, 200),
      price: Number.isFinite(body.price) ? Number(body.price) : 0,
      currency: String(body.currency ?? "USD").slice(0, 8),
      image: typeof body.image === "string" ? body.image : null,
      summary: String(body.summary ?? "").slice(0, 400),
      description: String(body.description ?? "").slice(0, 20000),
      chargeType: String(body.chargeType ?? "ONE_TIME").slice(0, 24),
      customFields: normCustomFields(body.customFields),
      categorySlugs,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });
    return NextResponse.json({ ok: true, id });
  }
  