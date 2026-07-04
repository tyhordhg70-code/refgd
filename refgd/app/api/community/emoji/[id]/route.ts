import { NextResponse } from "next/server";
import { getCustomEmoji, saveCustomEmoji, isPackEmoji } from "@/lib/community";
import { communityBotToken } from "@/lib/community-bot";
import { CUSTOM_EMOJI_IDS } from "@/lib/custom-emoji";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mimes we serve: static images go in an <img>; video (.webm) stickers are
 * served as video/webm and the client swaps to a <video>. Lottie (.tgs) has no
 * entry → 404, so those fall back to their static thumbnail / the Apple sprite.
 */
const EXT_MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webm: "video/webm",
};

const MAX_STICKER_BYTES = 512 * 1024;

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
 * First hit downloads the artwork via the Bot API (getCustomEmojiStickers →
 * getFile): video packs yield an animated .webm (served video/webm), Lottie
 * packs fall back to their static WEBP thumbnail, static packs serve the image
 * directly. The bytes are cached in Postgres; every later hit is served
 * straight from the cache. Without COMMUNITY_BOT_TOKEN (local dev) this 404s
 * and the client falls back to the plain Apple-emoji sprite.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,32}$/.test(id)) return new NextResponse(null, { status: 400 });
  // Version the Postgres cache key by ?v so a bumped client (format.tsx) forces
  // a re-fetch: ids first cached as a STATIC thumbnail under the old fileId
  // logic live under the bare `id`, so a new `${id}:v2` key misses the cache and
  // re-downloads the real animated .webm document. Old rows are left untouched
  // (additive — no destructive prod write). The allowlist + Telegram fetch still
  // key off the raw numeric id; only the cache row is versioned.
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
  if (cached) return imageResponse(cached.bytes, cached.mime);

  const token = communityBotToken();
  if (!token) return new NextResponse(null, { status: 404 });

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
    if (!sticker) return new NextResponse(null, { status: 404 });

    // Video (.webm) stickers CAN animate in a <video>, so prefer the real
    // document (file_id) and only fall back to the static thumbnail. Animated
    // Lottie (.tgs) can't render → use its static thumbnail. Static stickers
    // prefer the thumbnail (already <img>-safe) then the document itself.
    const fileId = sticker.is_video
      ? (sticker.file_id ?? sticker.thumbnail?.file_id)
      : sticker.is_animated
        ? sticker.thumbnail?.file_id
        : (sticker.thumbnail?.file_id ?? sticker.file_id);
    if (!fileId) return new NextResponse(null, { status: 404 });

    const gfRes = await fetch(`${api}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    const gfJson = (await gfRes.json()) as {
      ok?: boolean;
      result?: { file_path?: string };
    };
    const filePath = gfJson.ok ? gfJson.result?.file_path : undefined;
    if (!filePath) return new NextResponse(null, { status: 404 });

    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const mime = EXT_MIME[ext];
    if (!mime) return new NextResponse(null, { status: 404 });

    const dlRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${filePath}`,
    );
    if (!dlRes.ok) return new NextResponse(null, { status: 404 });
    const bytes = Buffer.from(await dlRes.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_STICKER_BYTES) {
      return new NextResponse(null, { status: 404 });
    }

    await saveCustomEmoji(cacheKey, bytes, mime);
    return imageResponse(bytes, mime);
  } catch {
    // Fail soft — the client swaps to the Apple-emoji sprite on error.
    return new NextResponse(null, { status: 404 });
  }
}
