import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  getCustomEmojiStickers,
  getStickerSet,
  communityBotToken,
} from "@/lib/community-bot";
import { upsertPackEmoji, type PackEmoji } from "@/lib/community";
import { CUSTOM_EMOJI } from "@/lib/custom-emoji";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/community/emoji/discover — admin-only.
 *
 * Expands the handful of seed custom-emoji ids (lib/custom-emoji.ts) into their
 * full Telegram packs: resolve each seed id → its owning set_name, then pull
 * every emoji in each unique set via getStickerSet and upsert them into
 * community_emoji_pack. The composer's Custom tab then offers the whole pack,
 * and the [id] serving route allows those ids. Idempotent; run once on Render.
 * Fails soft — a missing token or a Telegram hiccup returns a clear error, not
 * a crash.
 */
export async function POST() {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  if (!communityBotToken()) {
    return NextResponse.json(
      { ok: false, error: "COMMUNITY_BOT_TOKEN not set" },
      { status: 503 },
    );
  }

  const seedIds = CUSTOM_EMOJI.map((c) => c.id);
  const seedStickers = await getCustomEmojiStickers(seedIds);
  const setNames = Array.from(
    new Set(
      seedStickers
        .map((s) => (s.set_name ?? "").trim())
        .filter((n): n is string => n.length > 0),
    ),
  );

  if (setNames.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No packs resolved from seed ids" },
      { status: 502 },
    );
  }

  const rows: PackEmoji[] = [];
  const seen = new Set<string>();
  const sets: Array<{ name: string; title: string; count: number }> = [];

  for (const name of setNames) {
    const set = await getStickerSet(name);
    if (!set) continue;
    let count = 0;
    for (const st of set.stickers) {
      const id = st.custom_emoji_id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({
        id,
        alt: st.emoji ?? "",
        setName: set.name,
        title: set.title,
      });
      count++;
    }
    sets.push({ name: set.name, title: set.title, count });
  }

  const upserted = await upsertPackEmoji(rows);
  return NextResponse.json({ ok: true, sets, discovered: rows.length, upserted });
}
