import { gunzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { getCustomEmoji, saveCustomEmoji, isPackEmoji } from "@/lib/community";
import { communityBotToken } from "@/lib/community-bot";
import { CUSTOM_EMOJI_IDS } from "@/lib/custom-emoji";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mimes we serve: static images go in an <img>; video (.webm) stickers are
 * served as video/webm and the client swaps to a <video>. Lottie (.tgs =
 * gzip-compressed Lottie JSON) is inflated server-side and served as
 * application/json — the client plays it with a vendored Lottie renderer
 * (/vendor/lottie-light.min.js), the same way Telegram Web A animates them.
 */
const EXT_MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webm: "video/webm",
};

const MAX_STICKER_BYTES = 512 * 1024;
/** Inflated Lottie JSON cap (tgs downloads stay under MAX_STICKER_BYTES). */
const MAX_LOTTIE_JSON_BYTES = 2 * 1024 * 1024;

/**
 * Telegram's thumbnail for some stickers is an alpha-only ~120-360 byte WEBP
 * that decodes FULLY TRANSPARENT: an <img> "loads" it without error so the
 * client cascade never advances and the emoji renders invisible. Any body
 * smaller than this floor is treated as unusable — it is still cached (as a
 * poison marker so later views skip the Bot API) but served as 404, which
 * pushes the client on to its visible Apple-sprite fallback.
 */
const MIN_STICKER_BYTES = 500;

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
  const v = new URL(req.url).searchParams.get("v");
  const cacheKey = v && /^\d{1,4}$/.test(v) ? `${id}:v${v}` : id;
  // Unauthenticated route: serve ONLY allowlisted ids — the static seed pack
  // (lib/custom-emoji.ts) ∪ ids discovered into community_emoji_pack by an
  // admin. Anything else is rejected before touching the cache or the Telegram
  // API (no unbounded DB growth, no fetch amplification via hand-typed tokens).
  if (!CUSTOM_EMOJI_IDS.has(id) && !(await isPackEmoji(id))) {
    return new NextResponse(null, { status: 404 });
  }

  const cached = await getCustomEmoji(cacheKey);
  if (cached) {
    // A sub-floor row is a known-blank poison marker (see MIN_STICKER_BYTES):
    // 404 without re-hitting the Bot API so the client shows its sprite.
    if (cached.bytes.length < MIN_STICKER_BYTES) {
      return new NextResponse(null, { status: 404 });
    }
    return imageResponse(cached.bytes, cached.mime);
  }

  // When a versioned key (`id:vN`) misses and Telegram can't produce fresh
  // artwork, fall back to the pre-bump row cached under the bare id: a stale
  // still of the REAL pack artwork beats the wrong-looking Apple sprite. This
  // also keeps a ?v bump's cache-wide re-fetch stampede from degrading tiles
  // whenever the Bot API rate-limits or hiccups.
  const staleLegacy = async () => {
    if (cacheKey !== id) {
      const legacy = await getCustomEmoji(id);
      if (legacy && legacy.bytes.length >= MIN_STICKER_BYTES) {
        return imageResponse(legacy.bytes, legacy.mime);
      }
    }
    return new NextResponse(null, { status: 404 });
  };

  const token = communityBotToken();
  if (!token) return staleLegacy();

  try {
    const api = `https://api.telegram.org/bot${token}`;
    const stRes = await fetch(`${api}/getCustomEmojiStickers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_emoji_ids: [id] }),
    });
    const stJson = (await stRes.json()) as {
      ok?: boolean;
      result?: Array<{
        file_id?: string;
        is_animated?: boolean;
        is_video?: boolean;
        thumbnail?: { file_id?: string };
      }>;
    };
    const sticker = stJson.ok ? stJson.result?.[0] : undefined;
    if (!sticker) return staleLegacy();

    // ORIGINALS FIRST (owner requirement — no substitute artwork): every pack
    // type serves its real document (file_id) — video → animated .webm for a
    // <video>, static → full-res WEBP for an <img>, animated Lottie → .tgs
    // inflated to Lottie JSON for the client's vendored player. The low-res
    // static thumbnail is only the fallback when the document itself fails.
    const tryFile = async (
      fid: string | undefined,
    ): Promise<{ bytes: Buffer; mime: string } | null> => {
      if (!fid) return null;
      const gfRes = await fetch(`${api}/getFile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fid }),
      });
      const gfJson = (await gfRes.json()) as {
        ok?: boolean;
        result?: { file_path?: string };
      };
      const filePath = gfJson.ok ? gfJson.result?.file_path : undefined;
      if (!filePath) return null;

      const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
      if (ext !== "tgs" && !EXT_MIME[ext]) return null;

      const dlRes = await fetch(
        `https://api.telegram.org/file/bot${token}/${filePath}`,
      );
      if (!dlRes.ok) return null;
      const bytes = Buffer.from(await dlRes.arrayBuffer());
      if (bytes.length > MAX_STICKER_BYTES) return null;

      if (ext === "tgs") {
        // TGS = gzip-compressed Lottie JSON (magic 1f 8b; be lenient if a
        // file ever arrives already inflated). maxOutputLength makes gunzip
        // throw instead of ballooning memory on a hostile/corrupt archive.
        try {
          const json =
            bytes[0] === 0x1f && bytes[1] === 0x8b
              ? gunzipSync(bytes, { maxOutputLength: MAX_LOTTIE_JSON_BYTES })
              : bytes;
          if (json.length > MAX_LOTTIE_JSON_BYTES) return null;
          return { bytes: json, mime: "application/json" };
        } catch {
          return null;
        }
      }
      return { bytes, mime: EXT_MIME[ext] };
    };

    const art =
      (await tryFile(sticker.file_id)) ??
      (await tryFile(sticker.thumbnail?.file_id));
    if (!art) return staleLegacy();
    if (art.bytes.length < MIN_STICKER_BYTES) {
      // Blank alpha-only thumbnail: cache it as a poison marker (later views
      // skip the Bot API) and 404 — a stale legacy row for this id would be
      // the same blank artwork.
      await saveCustomEmoji(cacheKey, art.bytes, art.mime);
      return new NextResponse(null, { status: 404 });
    }

    await saveCustomEmoji(cacheKey, art.bytes, art.mime);
    return imageResponse(art.bytes, art.mime);
  } catch {
    // Fail soft — stale artwork beats an error page.
    return staleLegacy();
  }
}
