import { NextResponse } from "next/server";
import { getCustomEmoji, saveCustomEmoji } from "@/lib/community";
import { getCachedBlob, putCachedBlob } from "@/lib/blob-cache";
import { communityBotToken } from "@/lib/community-bot";
import {
  fetchStickerArt,
  MIN_STICKER_BYTES,
  type TgSticker,
} from "@/lib/emoji-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/community/animated-emoji/[key]
 *
 * Serves Telegram's animated (.tgs → Lottie JSON) version of a STANDARD
 * emoji — the artwork Telegram clients play when a message is a single
 * emoji. `key` is the emoji's codepoints as lowercase hex joined by `-`
 * (e.g. 1f602, 2764-fe0f), never the raw character, so no URL-encoding
 * ambiguity can reach the matcher.
 *
 * Artwork comes from Telegram's official "AnimatedEmojies" sticker set
 * (getStickerSet → getFile), inflated server-side and cached in Postgres
 * under `ae:<key>` — the same custom_emoji table the pack-emoji route uses
 * (its ids are numeric, so the `ae:` prefix can't collide). A set-level
 * in-memory cache keeps repeat misses from re-downloading the whole set
 * index. Without COMMUNITY_BOT_TOKEN (local dev) this 404s no-store and
 * the client falls back to the static Apple sprite — for standard emoji a
 * static same-glyph fallback is correct (the originals-only rule protects
 * pack artwork, not unicode emoji).
 */

/** codepoint hex key: 2-8 hex chars per point, up to 8 points (ZWJ seqs). */
const KEY_RE = /^[0-9a-f]{2,8}(?:-[0-9a-f]{2,8}){0,7}$/;

type SetSticker = TgSticker & { emoji?: string };

/** Strip FE0F variation selectors so ❤️/❤ resolve to the same artwork. */
function normKey(hexKey: string): string {
  return hexKey
    .split("-")
    .filter((h) => h !== "fe0f")
    .join("-");
}

/** Additionally strip skin-tone modifiers so 👍🏽 falls back to base 👍. */
function baseKey(hexKey: string): string {
  return normKey(hexKey)
    .split("-")
    .filter((h) => {
      const cp = parseInt(h, 16);
      return cp < 0x1f3fb || cp > 0x1f3ff;
    })
    .join("-");
}

function emojiToKey(emoji: string): string {
  return Array.from(emoji)
    .map((c) => (c.codePointAt(0) ?? 0).toString(16))
    .join("-");
}

/**
 * In-memory index of the AnimatedEmojies set: normalized hex key → sticker.
 * One getStickerSet call indexes ~640 stickers; re-fetched after an hour or
 * after a failure (failures are NOT cached).
 */
let setIndex: Map<string, SetSticker> | null = null;
let setFetchedAt = 0;
let setPromise: Promise<Map<string, SetSticker> | null> | null = null;
const SET_TTL_MS = 60 * 60 * 1000;

async function loadSetIndex(
  token: string,
): Promise<Map<string, SetSticker> | null> {
  const now = Date.now();
  if (setIndex && now - setFetchedAt < SET_TTL_MS) return setIndex;
  if (!setPromise) {
    setPromise = (async () => {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/getStickerSet`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "AnimatedEmojies" }),
          },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          result?: { stickers?: SetSticker[] };
        };
        if (!json.ok || !json.result?.stickers) return null;
        const idx = new Map<string, SetSticker>();
        for (const s of json.result.stickers) {
          if (!s.emoji) continue;
          const k = normKey(emojiToKey(s.emoji));
          if (!idx.has(k)) idx.set(k, s);
        }
        setIndex = idx;
        setFetchedAt = Date.now();
        return idx;
      } catch {
        return null;
      } finally {
        setPromise = null;
      }
    })();
  }
  return setPromise;
}

function artResponse(bytes: Buffer, mime: string) {
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Cache-Control":
        "public, max-age=31536000, immutable, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}

/** Misses must never be browser-cached (the ?v=4 immutable-degraded lesson). */
function missResponse() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!KEY_RE.test(key)) return new NextResponse(null, { status: 400 });

  const cacheKey = `ae:${normKey(key)}`;

  // In-process byte cache first (July 2026 Neon-egress incident): only
  // full-quality immutable artwork is remembered — misses stay no-store.
  const mem = getCachedBlob(cacheKey);
  if (mem) return artResponse(mem.bytes, mem.mime);
  const remember = (bytes: Buffer, mime: string) => {
    putCachedBlob(cacheKey, bytes, mime);
    return artResponse(bytes, mime);
  };

  const cached = await getCustomEmoji(cacheKey);
  if (cached) {
    // Sub-floor row = poison marker (emoji not in the set): 404 without
    // re-hitting the Bot API; the client stays on its static sprite.
    if (cached.bytes.length < MIN_STICKER_BYTES) return missResponse();
    return remember(cached.bytes, cached.mime);
  }

  const token = communityBotToken();
  if (!token) return missResponse();

  try {
    const idx = await loadSetIndex(token);
    if (!idx) return missResponse(); // set fetch failed — retry next view

    const sticker = idx.get(normKey(key)) ?? idx.get(baseKey(key));
    if (!sticker) {
      // Telegram ANSWERED and this emoji has no animated artwork. No DB
      // poison marker here: the route is unauthenticated and KEY_RE admits a
      // huge keyspace, so caching misses would let anyone grow the table
      // unboundedly. A set-miss is already cheap — the AnimatedEmojies index
      // is memoized in module memory (1h TTL), so this is just a Map lookup.
      return missResponse();
    }

    const art = await fetchStickerArt(token, sticker);
    if (!art || art.bytes.length < MIN_STICKER_BYTES) return missResponse();

    await saveCustomEmoji(cacheKey, art.bytes, art.mime);
    return remember(art.bytes, art.mime);
  } catch {
    return missResponse();
  }
}
