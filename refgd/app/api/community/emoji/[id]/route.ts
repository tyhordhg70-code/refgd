import { NextResponse } from "next/server";
import { getCustomEmoji, saveCustomEmoji } from "@/lib/community";
import { communityBotToken } from "@/lib/community-bot";
import { CUSTOM_EMOJI_IDS } from "@/lib/custom-emoji";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Static image mimes browsers can put in an <img>. Animated .tgs/.webm 404. */
const EXT_MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
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
 * First hit downloads the static artwork via the Bot API
 * (getCustomEmojiStickers → getFile, preferring the WEBP thumbnail so
 * animated packs still yield an <img>-safe image) and caches it in Postgres;
 * every later hit is served straight from the cache. Without
 * COMMUNITY_BOT_TOKEN (local dev) this 404s and the client falls back to the
 * plain Apple-emoji sprite.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,32}$/.test(id)) return new NextResponse(null, { status: 400 });
  // Unauthenticated route: serve ONLY the known community pack — anything
  // else is rejected before touching the cache or the Telegram API (no
  // unbounded DB growth, no fetch amplification via hand-typed tokens).
  if (!CUSTOM_EMOJI_IDS.has(id)) return new NextResponse(null, { status: 404 });

  const cached = await getCustomEmoji(id);
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

    // Animated (.tgs) / video (.webm) stickers can't go in an <img>; their
    // thumbnail is a static image, so prefer it whenever present.
    const fileId =
      sticker.thumbnail?.file_id ??
      (!sticker.is_animated && !sticker.is_video ? sticker.file_id : undefined);
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

    await saveCustomEmoji(id, bytes, mime);
    return imageResponse(bytes, mime);
  } catch {
    // Fail soft — the client swaps to the Apple-emoji sprite on error.
    return new NextResponse(null, { status: 404 });
  }
}
