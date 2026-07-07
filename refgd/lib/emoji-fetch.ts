import { gunzipSync } from "node:zlib";

/**
 * Shared Telegram custom-emoji download pipeline, used by
 * /api/community/emoji/[id] (single-id, on-demand) and
 * /api/community/emoji/warm (batched cache warmer).
 *
 * Mimes we serve: static images go in an <img>; video (.webm) stickers are
 * served as video/webm and the client swaps to a <video>. Lottie (.tgs =
 * gzip-compressed Lottie JSON) is inflated server-side and served as
 * application/json — the client plays it with a vendored Lottie renderer
 * (/vendor/lottie-light.min.js), the same way Telegram Web A animates them.
 */
export const EXT_MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webm: "video/webm",
};

export const MAX_STICKER_BYTES = 512 * 1024;
/** Inflated Lottie JSON cap (tgs downloads stay under MAX_STICKER_BYTES). */
export const MAX_LOTTIE_JSON_BYTES = 2 * 1024 * 1024;

/**
 * Telegram's thumbnail for some stickers is an alpha-only ~120-360 byte WEBP
 * that decodes FULLY TRANSPARENT: an <img> "loads" it without error so the
 * client cascade never advances and the emoji renders invisible. Any body
 * smaller than this floor is treated as unusable — it is still cached (as a
 * poison marker so later views skip the Bot API) but served as 404.
 */
export const MIN_STICKER_BYTES = 500;

/** First ?v whose rows hold ORIGINAL documents (v3 and bare rows = old static
 *  thumbnails — never copy those forward). */
export const FIRST_ORIGINALS_VERSION = 4;

export interface TgSticker {
  custom_emoji_id?: string;
  file_id?: string;
  /** Owning pack slug — Telegram sends it; discovery uses it to pull the whole pack. */
  set_name?: string;
  emoji?: string;
  is_animated?: boolean;
  is_video?: boolean;
  thumbnail?: { file_id?: string };
}

/**
 * Resolve sticker metadata for up to 200 custom-emoji ids in ONE Bot API
 * call (getCustomEmojiStickers accepts a batch — hammering it per-id is what
 * rate-limited the first mass re-warm). Returns the map keyed by emoji id
 * plus an `ok` flag: ok=true means Telegram ANSWERED (ids absent from the
 * map are genuinely unknown/deleted and safe to poison); ok=false means the
 * call itself failed (rate limit/network) and nothing can be concluded — an
 * empty map alone can't distinguish "all 30 ids deleted" from a 429.
 */
export async function getStickersBatch(
  token: string,
  ids: string[],
): Promise<{ ok: boolean; stickers: Map<string, TgSticker> }> {
  const stickers = new Map<string, TgSticker>();
  let ok = false;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getCustomEmojiStickers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custom_emoji_ids: chunk }),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        result?: TgSticker[];
      };
      if (!json.ok) continue;
      ok = true;
      for (const s of json.result ?? []) {
        if (s.custom_emoji_id) stickers.set(String(s.custom_emoji_id), s);
      }
    } catch {
      // chunk failed; ok stays false unless another chunk succeeds
    }
  }
  return { ok, stickers };
}

/**
 * ORIGINALS FIRST (owner requirement — no substitute artwork): every pack
 * type serves its real document (file_id) — video → animated .webm for a
 * <video>, static → full-res WEBP for an <img>, animated Lottie → .tgs
 * inflated to Lottie JSON for the client's vendored player. The low-res
 * static thumbnail is only the fallback when the document itself fails.
 */
export async function fetchStickerArt(
  token: string,
  sticker: TgSticker,
): Promise<{ bytes: Buffer; mime: string } | null> {
  const api = `https://api.telegram.org/bot${token}`;

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

  return (await tryFile(sticker.file_id)) ?? (await tryFile(sticker.thumbnail?.file_id));
}
