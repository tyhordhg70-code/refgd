import { NextResponse } from "next/server";
import {
  copyCustomEmojiVersion,
  listPackEmoji,
  listWarmedEmojiIds,
  saveCustomEmoji,
} from "@/lib/community";
import { communityBotToken } from "@/lib/community-bot";
import { CUSTOM_EMOJI, EMOJI_CACHE_VERSION } from "@/lib/custom-emoji";
import {
  fetchStickerArt,
  FIRST_ORIGINALS_VERSION,
  getStickersBatch,
  MIN_STICKER_BYTES,
} from "@/lib/emoji-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ids downloaded from Telegram per invocation (call repeatedly until
 *  remaining=0). Kept small so one call stays well inside request timeouts
 *  and Bot API rate limits. */
const FETCH_CAP = 30;
const CONCURRENCY = 3;

/**
 * GET /api/community/emoji/warm
 *
 * Batched cache warmer for the custom-emoji picker. The per-id route melts
 * down when ~2,300 tiles all miss at once (one getCustomEmojiStickers call
 * PER EMOJI → Telegram 429s → blank tiles), so this endpoint warms the
 * current ?v cache server-side instead:
 *
 *  1. copies forward every previous-version row (those already hold the
 *     original documents — zero Bot API calls), then
 *  2. resolves up to FETCH_CAP missing ids via ONE batched
 *     getCustomEmojiStickers call and downloads their documents with bounded
 *     concurrency.
 *
 * Public but harmless: it only touches allowlisted ids (seed ∪ discovered
 * packs), only ids still missing from the cache, capped per call, and is a
 * no-op once everything is warm. Response reports progress so a caller can
 * loop until `remaining` hits 0.
 */
export async function GET() {
  const v = EMOJI_CACHE_VERSION;

  const copied =
    v > FIRST_ORIGINALS_VERSION ? await copyCustomEmojiVersion(v - 1, v) : 0;

  const packs = await listPackEmoji();
  const all = new Set<string>(CUSTOM_EMOJI.map((c) => c.id));
  for (const p of packs) all.add(p.id);
  const cached = await listWarmedEmojiIds(v);
  const missing = [...all].filter((id) => !cached.has(id));

  const token = communityBotToken();
  if (!token || missing.length === 0) {
    return NextResponse.json({
      ok: true,
      version: v,
      total: all.size,
      copied,
      fetched: 0,
      poisoned: 0,
      unknown: 0,
      failed: 0,
      remaining: missing.length,
      ...(token ? {} : { note: "no bot token; copy-forward only" }),
    });
  }

  // Random slice so a handful of permanently-failing ids can't head-of-line
  // block every subsequent call at the same first-N window.
  for (let i = missing.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [missing[i], missing[j]] = [missing[j], missing[i]];
  }
  const batch = missing.slice(0, FETCH_CAP);
  const { ok: batchOk, stickers } = await getStickersBatch(token, batch);

  let fetched = 0;
  let poisoned = 0;
  let unknown = 0;
  let failed = 0;

  let cursor = 0;
  const worker = async () => {
    while (cursor < batch.length) {
      const id = batch[cursor++];
      const sticker = stickers.get(id);
      if (!sticker) {
        // Telegram ANSWERED the batch call but omitted this id — the pack
        // was deleted: poison it so we stop re-asking every call. (When the
        // call itself failed — rate limit/network — nothing can be
        // concluded, so the id stays missing for the next call.)
        if (batchOk) {
          await saveCustomEmoji(`${id}:v${v}`, Buffer.alloc(0), "application/octet-stream");
          poisoned++;
        } else {
          unknown++;
        }
        continue;
      }
      try {
        const art = await fetchStickerArt(token, sticker);
        if (!art) {
          failed++;
          continue;
        }
        if (art.bytes.length < MIN_STICKER_BYTES) {
          await saveCustomEmoji(`${id}:v${v}`, art.bytes, art.mime);
          poisoned++;
          continue;
        }
        await saveCustomEmoji(`${id}:v${v}`, art.bytes, art.mime);
        fetched++;
      } catch {
        failed++;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker),
  );

  return NextResponse.json({
    ok: true,
    version: v,
    total: all.size,
    copied,
    fetched,
    poisoned,
    unknown,
    failed,
    remaining: missing.length - batch.length + failed + unknown,
  });
}
