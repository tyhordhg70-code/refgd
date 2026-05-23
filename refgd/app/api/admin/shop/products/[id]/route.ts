import { NextResponse } from "next/server";
  import { readSession } from "@/lib/auth";
  import {
    deleteProduct, getProduct, upsertProduct, getShopCatalog,
    type ShopCustomField,
  } from "@/lib/shop-catalog";

  export const dynamic = "force-dynamic";

  async function requireAuth() {
    const s = await readSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return null;
  }

  function normCustomFields(input: unknown): ShopCustomField[] | undefined {
    if (!Array.isArray(input)) return undefined;
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

  export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const u = await requireAuth(); if (u) return u;
    const existing = await getProduct(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    let categorySlugs = existing.categorySlugs;
    if (Array.isArray(body.categorySlugs)) {
      const catalog = await getShopCatalog();
      const valid = new Set(catalog.categories.map((c) => c.slug));
      categorySlugs = body.categorySlugs.map(String).filter((s: string) => valid.has(s));
    }
    const cf = normCustomFields(body.customFields);

    await upsertProduct({
      id: existing.id,
      title: typeof body.title === "string" ? body.title.trim().slice(0, 200) : existing.title,
      price: Number.isFinite(body.price) ? Number(body.price) : existing.price,
      currency: typeof body.currency === "string" ? body.currency.slice(0, 8) : existing.currency,
      image: body.image === null ? null : (typeof body.image === "string" ? body.image : existing.image),
      summary: typeof body.summary === "string" ? body.summary.slice(0, 400) : existing.summary,
      description: typeof body.description === "string" ? body.description.slice(0, 20000) : existing.description,
      chargeType: typeof body.chargeType === "string" ? body.chargeType.slice(0, 24) : existing.chargeType,
      customFields: cf ?? existing.customFields,
      categorySlugs,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : existing.sortOrder,
    });
    return NextResponse.json({ ok: true });
  }

  export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const u = await requireAuth(); if (u) return u;
    const existing = await getProduct(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  }
  