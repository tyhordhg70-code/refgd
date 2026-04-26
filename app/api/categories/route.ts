import { NextResponse } from "next/server";
import { getAllCategoriesMerged, getExtraCategories, CANNED_CATEGORIES } from "@/lib/categories-store";

export const dynamic = "force-dynamic";

/**
 * Public list of categories available for the filter dropdown on
 * /store-list. Returns the merged set (canned + admin-curated extras +
 * categories actually used by stores) plus, for clients that care, a
 * breakdown so the admin UI can mark which entries are removable.
 */
export async function GET() {
  try {
    const [merged, extras] = await Promise.all([
      getAllCategoriesMerged(),
      getExtraCategories(),
    ]);
    return NextResponse.json({
      categories: merged,
      canned: CANNED_CATEGORIES,
      extras,
    });
  } catch (err) {
    console.error("[categories GET] failed:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `DB error: ${msg.slice(0, 200)}` },
      { status: 500 },
    );
  }
}
