import { NextResponse } from "next/server";
import { getCustomEmoji, saveCustomEmoji, isPackEmoji } from "@/lib/community";
import { communityBotToken } from "@/lib/community-bot";
import { CUSTOM_EMOJI_IDS, EMOJI_CACHE_VERSION } from "@/lib/custom-emoji";
import {
  fetchStickerArt,
  FIRST_ORIGINALS_VERSION,
  MIN_STICKER_BYTES,
  type TgSticker,
} from "@/lib/emoji-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function imageResponse(bytes: Buffer, mime: string) {
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

/**
 * Degraded responses must NEVER be browser-cacheable: during the first ?v=4
 * re-warm, Telegram rate-limited the fetch stampede and the stale-legacy
 * still images went out under the versioned URL with the IMMUTABLE header
 * above — pinning wrong, non-animated artwork in browsers for a year. Any
 * miss/fallback path now goes out no-store so the next view retries.
 */
function degradedResponse(bytes: Buffer | null, mime?: string) {
  if (bytes && mime) {
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store",
      },
    });
  }
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/community/emoji/[id]
 *
 * Serves a custom (premium pack) emoji sticker by Telegram document id.
 * First hit downloads the ORIGINAL document via the Bot API
 * (getCustomEmojiStickers → getFile): video packs yield an animated .webm
 * (served video/webm), Lottie packs yield inflated Lottie JSON (served
 * application/json for the client's vendored player), static packs serve the
 * full-res image. The bytes are cached in Postgres; every later hit is served
 * straight from the cache. Without COMMUNITY_BOT_TOKEN (local dev) this 404s
 * and the client retries, then leaves the tile blank (never a substitute).
 *
 * Bulk warming lives in /api/community/emoji/warm (batched Bot API calls) —
 * this route is the per-id backstop.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,32}$/.test(id)) return new NextResponse(null, { status: 400 });
  // Version the Postgres cache key by ?v so a bumped client (format.tsx) forces
  // a re-fetch: ids first cached as a STATIC thumbnail under the old fileId
  // logic live under the bare `id`, so a new `${id}:vN` key misses the cache and
  // re-downloads the real original document (.webm for video packs, full-res
  // sticker for static packs). Old rows are left untouched (additive — no
  // destructive prod write) and double as the stale fallback below. The
  // allowlist + Telegram fetch still key off the raw numeric id; only the
  // cache row is versioned.
  // Clamp ?v to the shipped client version: this route is unauthenticated and
  // the self-heal below copies rows forward, so an unbounded v would let a
  // client walking v=5,6,7… clone a cached row thousands of times.
  const v = new URL(req.url).searchParams.get("v");
  const vParsed = v && /^\d{1,4}$/.test(v) ? parseInt(v, 10) : null;
  const vNum =
    vParsed && vParsed <= EMOJI_CACHE_VERSION ? vParsed : null;
  const cacheKey = vNum ? `${id}:v${vNum}` : id;

  // CACHE-FIRST, allowlist second: bytes already cached in Postgres are served
  // even when the id is no longer allowlisted, so an admin removing a pack
  // from the picker (community_emoji_pack) never blanks that pack's emoji in
  // EXISTING messages. The allowlist gate below protects only the expensive
  // paths (Telegram fetch / new cache rows) — same security intent (no
  // unbounded DB growth, no fetch amplification via hand-typed tokens), since
  // cached rows can only exist for ids that were allowlisted at fetch time.
  const cached = await getCustomEmoji(cacheKey);
  if (cached) {
    // A sub-floor row is a known-blank poison marker (see MIN_STICKER_BYTES):
    // 404 without re-hitting the Bot API so the client stays on its cascade.
    if (cached.bytes.length < MIN_STICKER_BYTES) {
      return degradedResponse(null);
    }
    return imageResponse(cached.bytes, cached.mime);
  }

  // Version-bump self-heal: rows from the previous ?v (>= v4) already hold the
  // ORIGINAL documents, so a bump only needs a cheap row copy — not a fresh
  // Telegram download. This keeps a bump from re-triggering the rate-limit
  // stampede that broke the v4 warm-up. (v3/bare rows are old static
  // thumbnails and are deliberately never copied forward.) Runs before the
  // allowlist gate on purpose: it only copies bytes that are already cached.
  if (vNum && vNum > FIRST_ORIGINALS_VERSION) {
    const prev = await getCustomEmoji(`${id}:v${vNum - 1}`);
    if (prev && prev.bytes.length >= MIN_STICKER_BYTES) {
      await saveCustomEmoji(cacheKey, prev.bytes, prev.mime);
      return imageResponse(prev.bytes, prev.mime);
    }
  }

  // When a versioned key (`id:vN`) misses and Telegram can't produce fresh
  // artwork, fall back to the pre-bump row cached under the bare id: a stale
  // still of the REAL pack artwork beats an empty tile. Served no-store so a
  // Bot API hiccup never gets pinned into the browser cache (the ?v=4 lesson).
  const staleLegacy = async () => {
    if (cacheKey !== id) {
      const legacy = await getCustomEmoji(id);
      if (legacy && legacy.bytes.length >= MIN_STICKER_BYTES) {
        return degradedResponse(legacy.bytes, legacy.mime);
      }
    }
    return degradedResponse(null);
  };

  // Unauthenticated route: only allowlisted ids may reach the Telegram API or
  // create new cache rows — the static seed pack (lib/custom-emoji.ts) ∪ ids
  // discovered into community_emoji_pack by an admin. Anything else stops
  // here (no unbounded DB growth, no fetch amplification via hand-typed
  // tokens); a removed-pack id still gets its stale legacy row above.
  if (!CUSTOM_EMOJI_IDS.has(id) && !(await isPackEmoji(id))) {
    return staleLegacy();
  }

  const token = communityBotToken();
  if (!token) return staleLegacy();

  try {
    const stRes = await fetch(
      `https://api.telegram.org/bot${token}/getCustomEmojiStickers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_emoji_ids: [id] }),
      },
    );
    const stJson = (await stRes.json()) as {
      ok?: boolean;
      result?: TgSticker[];
    };
    const sticker = stJson.ok ? stJson.result?.[0] : undefined;
    if (!sticker) return staleLegacy();

    const art = await fetchStickerArt(token, sticker);
    if (!art) return staleLegacy();
    if (art.bytes.length < MIN_STICKER_BYTES) {
      // Blank alpha-only thumbnail: cache it as a poison marker (later views
      // skip the Bot API) and 404 — a stale legacy row for this id would be
      // the same blank artwork.
      await saveCustomEmoji(cacheKey, art.bytes, art.mime);
      return degradedResponse(null);
    }

    await saveCustomEmoji(cacheKey, art.bytes, art.mime);
    return imageResponse(art.bytes, art.mime);
  } catch {
    // Fail soft — stale artwork beats an error page.
    return staleLegacy();
  }
}
