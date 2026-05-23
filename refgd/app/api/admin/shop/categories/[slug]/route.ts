import { NextResponse } from "next/server";
  import { readSession } from "@/lib/auth";
  import { deleteCategory, getCategory, upsertCategory } from "@/lib/shop-catalog";

  export const dynamic = "force-dynamic";

  async function requireAuth() {
    const s = await readSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return null;
  }

  export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const u = await requireAuth(); if (u) return u;
    const existing = await getCategory(slug);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    await upsertCategory({
      slug: existing.slug,
      title: typeof body.title === "string" ? body.title.trim().slice(0, 120) : existing.title,
      tagline: typeof body.tagline === "string" ? body.tagline.slice(0, 280) : existing.tagline,
      longDescription: typeof body.longDescription === "string" ? body.longDescription.slice(0, 4000) : existing.longDescription,
      image: typeof body.image === "string" ? body.image : existing.image,
      accent: typeof body.accent === "string" ? body.accent.slice(0, 24) : existing.accent,
      rgb: typeof body.rgb === "string" ? body.rgb.slice(0, 24) : existing.rgb,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : existing.sortOrder,
    });
    return NextResponse.json({ ok: true });
  }

  export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const u = await requireAuth(); if (u) return u;
    const existing = await getCategory(slug);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteCategory(slug);
    return NextResponse.json({ ok: true });
  }
  