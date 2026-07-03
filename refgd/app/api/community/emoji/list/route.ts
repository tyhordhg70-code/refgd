import { NextResponse } from "next/server";
import { listPackEmoji } from "@/lib/community";
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
