import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import {
  addExtraCategory,
  removeExtraCategory,
  setCategoryLabel,
  getCategoryLabels,
  getAllCategoriesMerged,
  getExtraCategories,
  CANNED_CATEGORIES,
} from "@/lib/categories-store";

export const dynamic = "force-dynamic";

async function requireAuth(): Promise<NextResponse | null> {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

function ok(extras: string[], merged: string[], labels: Record<string, string>) {
  return NextResponse.json({
    categories: merged,
    canned: CANNED_CATEGORIES,
    extras,
    labels,
  });
}

/** POST { name } — add a new admin-curated category. */
export async function POST(req: Request) {
  const u = await requireAuth();
  if (u) return u;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "name (string) is required" }, { status: 400 });
  }
  try {
    const extras = await addExtraCategory(body.name);
    const [merged, labels] = await Promise.all([
      getAllCategoriesMerged(),
      getCategoryLabels(),
    ]);
    return ok(extras, merged, labels);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[categories POST] failed:", err);
    return NextResponse.json(
      { error: msg.slice(0, 200) },
      { status: 400 },
    );
  }
}

/**
 * DELETE ?name=Foo — remove an admin-curated category.
 * Refuses with 409 if any store still uses it. Canned categories
 * cannot be removed (returns 400).
 */
export async function DELETE(req: Request) {
  const u = await requireAuth();
  if (u) return u;
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  if (!name.trim()) {
    return NextResponse.json({ error: "name query param required" }, { status: 400 });
  }
  try {
    const extras = await removeExtraCategory(name);
    const [merged, labels] = await Promise.all([
      getAllCategoriesMerged(),
      getCategoryLabels(),
    ]);
    return ok(extras, merged, labels);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = /still used/i.test(msg) ? 409 : 400;
    console.error("[categories DELETE] failed:", err);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status });
  }
}

/** GET — same shape as the public route, useful for admin UIs that
 *  want a single endpoint and to bypass any future caching. */
export async function GET() {
  const u = await requireAuth();
  if (u) return u;
  try {
    const [extras, merged, labels] = await Promise.all([
      getExtraCategories(),
      getAllCategoriesMerged(),
      getCategoryLabels(),
    ]);
    return ok(extras, merged, labels);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[categories GET admin] failed:", err);
    return NextResponse.json(
      { error: `DB error: ${msg.slice(0, 200)}` },
      { status: 500 },
    );
  }
}

/**
 * PATCH { name, label } — set (or clear) the display label for a
 * category. The label may contain emoji and is purely cosmetic: the
 * underlying category key persisted on store rows is never touched, so
 * search / filtering / store-assignment keep working. An empty `label`
 * clears the override and the category reverts to its hardcoded / raw
 * name.
 */
export async function PATCH(req: Request) {
  const u = await requireAuth();
  if (u) return u;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.label !== "string") {
    return NextResponse.json(
      { error: "name (string) and label (string) are required" },
      { status: 400 },
    );
  }
  try {
    await setCategoryLabel(body.name, body.label);
    const [extras, merged, labels] = await Promise.all([
      getExtraCategories(),
      getAllCategoriesMerged(),
      getCategoryLabels(),
    ]);
    return ok(extras, merged, labels);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[categories PATCH] failed:", err);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 400 });
  }
}
