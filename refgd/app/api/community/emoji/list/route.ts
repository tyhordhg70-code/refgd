import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { listPackEmoji, upsertPackEmoji, type PackEmoji } from "@/lib/community";
import { CUSTOM_EMOJI } from "@/lib/custom-emoji";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/community/emoji/list
 *
 * Public. Returns the discovered custom-emoji packs, grouped by set, for the
 * composer's Custom tab. If discovery has never run (or the DB is empty), the
 * `groups` array is empty and the client falls back to the static seed set
 * (lib/custom-emoji.ts) so the tab always renders something.
 */
export async function GET() {
  let groups: Array<{
    setName: string;
    title: string;
    emoji: Array<{ id: string; alt: string }>;
  }> = [];

  try {
    const rows = await listPackEmoji();
    const bySet = new Map<
      string,
      { setName: string; title: string; emoji: Array<{ id: string; alt: string }> }
    >();
    for (const r of rows) {
      const key = r.setName || r.title || "pack";
      let g = bySet.get(key);
      if (!g) {
        g = { setName: r.setName, title: r.title || r.setName || "Custom", emoji: [] };
        bySet.set(key, g);
      }
      g.emoji.push({ id: r.id, alt: r.alt });
    }
    groups = Array.from(bySet.values()).filter((g) => g.emoji.length > 0);
  } catch {
    groups = [];
  }

  return NextResponse.json({
    ok: true,
    groups,
    fallback: CUSTOM_EMOJI.map((c) => ({ id: c.id, alt: c.alt })),
  });
}

/**
 * POST /api/community/emoji/list — admin-only single custom-emoji add.
 *
 * Adds ONE premium custom emoji to the pack library by its Telegram document
 * id, so the composer's Custom tab and the [id] serving route's allowlist
 * offer it immediately — without running full pack discovery. Idempotent.
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json(
      { ok: false, error: "Admins only" },
      { status: 403 },
    );
  }

  let payload: { id?: unknown; alt?: unknown };
  try {
    payload = (await req.json()) as { id?: unknown; alt?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const id =
    (typeof payload.id === "string" || typeof payload.id === "number") &&
    /^\d{1,32}$/.test(String(payload.id))
      ? String(payload.id)
      : null;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "A numeric custom-emoji id is required" },
      { status: 400 },
    );
  }

  const alt = typeof payload.alt === "string" ? payload.alt.slice(0, 16) : "";
  const rows: PackEmoji[] = [{ id, alt, setName: "Custom", title: "Custom" }];
  const upserted = await upsertPackEmoji(rows);
  return NextResponse.json({ ok: true, id, upserted });
}
