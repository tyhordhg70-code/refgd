import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  getCustomEmojiStickers,
  getStickerSet,
  communityBotToken,
} from "@/lib/community-bot";
import {
  EMOJI_PACK_DENYLIST_KEY,
  getModConfig,
  setModConfig,
  upsertPackEmoji,
  type PackEmoji,
} from "@/lib/community";
import { CUSTOM_EMOJI, SEED_SET_NAMES } from "@/lib/custom-emoji";

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
export async function POST(req: Request) {
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

  // Optional explicit pack (the admin "Add pack" input pastes a t.me/addemoji
  // link or short-name). Explicit adds fetch ONLY that set — and override a
  // previous removal by dropping the name from the denylist.
  let explicit = "";
  try {
    const body = (await req.json()) as { setName?: unknown };
    if (typeof body?.setName === "string") explicit = body.setName.trim();
  } catch {
    // No/invalid body = classic full discovery.
  }
  if (explicit && !/^[A-Za-z0-9_]{1,64}$/.test(explicit)) {
    return NextResponse.json(
      { ok: false, error: "Invalid pack name" },
      { status: 400 },
    );
  }

  // Packs the admin explicitly removed from the picker stay removed —
  // discovery must never resurrect them (neither the auto-run on an empty
  // pack list nor the manual "Load packs" button). An explicit re-add is the
  // one exception: it un-denylists that pack.
  const denylistRaw = await getModConfig<string[]>(EMOJI_PACK_DENYLIST_KEY, []);
  const denylist = new Set(Array.isArray(denylistRaw) ? denylistRaw : []);
  if (explicit && denylist.has(explicit)) {
    denylist.delete(explicit);
    await setModConfig(EMOJI_PACK_DENYLIST_KEY, Array.from(denylist));
  }

  let setNames: string[];
  if (explicit) {
    setNames = [explicit];
  } else {
    // Seed ids (harvested from imported history) resolve to their owning
    // packs; SEED_SET_NAMES covers the owner's packs whose emoji never
    // appeared in that history, so no seed id could reach them.
    const seedIds = CUSTOM_EMOJI.map((c) => c.id);
    const seedStickers = await getCustomEmojiStickers(seedIds);
    setNames = Array.from(
      new Set(
        [
          ...seedStickers.map((s) => (s.set_name ?? "").trim()),
          ...SEED_SET_NAMES,
        ].filter((n): n is string => n.length > 0 && !denylist.has(n)),
      ),
    );
  }

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

  // Explicit adds get precise feedback: a bad name 404s, and a regular
  // STICKER pack (no custom_emoji_id on any sticker — e.g. fstik.app packs)
  // is called out instead of silently adding nothing.
  if (explicit) {
    const only = sets[0];
    if (!only) {
      return NextResponse.json(
        { ok: false, error: `Pack "${explicit}" not found on Telegram` },
        { status: 404 },
      );
    }
    if (only.count === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `"${only.title}" is a sticker pack — it has no custom emoji for the picker`,
        },
        { status: 422 },
      );
    }
  }

  const upserted = await upsertPackEmoji(rows);
  return NextResponse.json({ ok: true, sets, discovered: rows.length, upserted });
}
