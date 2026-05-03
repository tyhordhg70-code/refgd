import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import {
  setCategoryOrder,
  getCategoryOrder,
  getAllCategoriesMerged,
  getExtraCategories,
  CANNED_CATEGORIES,
} from "@/lib/categories-store";

export const dynamic = "force-dynamic";

/**
 * v6.13.37 — Admin endpoint for the drag-rearrange category headlines
 * feature. PUT replaces the saved order; GET returns the current
 * order alongside the merged category list so the admin UI can
 * render the chips in the right sequence.
 *
 * Body: { order: string[] }
 */
async function requireAuth(): Promise<NextResponse | null> {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function PUT(req: Request) {
  const u = await requireAuth();
  if (u) return u;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.order)) {
    return NextResponse.json(
      { error: "order (string[]) is required" },
      { status: 400 },
    );
  }
  try {
    const order = await setCategoryOrder(body.order);
    const [extras, merged] = await Promise.all([
      getExtraCategories(),
      getAllCategoriesMerged(),
    ]);
    return NextResponse.json({
      order,
      categories: merged,
      canned: CANNED_CATEGORIES,
      extras,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[categories order PUT] failed:", err);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 400 });
  }
}

export async function GET() {
  const u = await requireAuth();
  if (u) return u;
  try {
    const [order, extras, merged] = await Promise.all([
      getCategoryOrder(),
      getExtraCategories(),
      getAllCategoriesMerged(),
    ]);
    return NextResponse.json({
      order,
      categories: merged,
      canned: CANNED_CATEGORIES,
      extras,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[categories order GET] failed:", err);
    return NextResponse.json(
      { error: `DB error: ${msg.slice(0, 200)}` },
      { status: 500 },
    );
  }
}
