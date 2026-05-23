import { NextResponse } from "next/server";
  import { readSession } from "@/lib/auth";
  import { getShopCatalog, upsertCategory } from "@/lib/shop-catalog";

  export const dynamic = "force-dynamic";

  async function requireAuth() {
    const s = await readSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return null;
  }

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  export async function GET() {
    const u = await requireAuth();
    if (u) return u;
    const c = await getShopCatalog();
    return NextResponse.json({ categories: c.categories });
  }

  export async function POST(req: Request) {
    const u = await requireAuth();
    if (u) return u;
    const body = await req.json().catch(() => null);
    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const slug = body.slug ? slugify(String(body.slug)) : slugify(body.title);
    if (!slug) return NextResponse.json({ error: "invalid slug" }, { status: 400 });

    const existing = await getShopCatalog();
    const maxOrder = existing.categories.reduce((m, c) => Math.max(m, c.sortOrder), 0);

    await upsertCategory({
      slug,
      title: String(body.title).trim().slice(0, 120),
      tagline: String(body.tagline ?? "").slice(0, 280),
      longDescription: String(body.longDescription ?? "").slice(0, 4000),
      image: String(body.image ?? ""),
      accent: String(body.accent ?? "violet").slice(0, 24),
      rgb: String(body.rgb ?? "167,139,250").slice(0, 24),
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : maxOrder + 10,
    });
    return NextResponse.json({ ok: true, slug });
  }
  