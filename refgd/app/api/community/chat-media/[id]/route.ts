import { NextResponse } from "next/server";
import { getChatMedia } from "@/lib/community";
import { getCachedBlob, putCachedBlob } from "@/lib/blob-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/community/chat-media/[id]
 *
 * Serves a chat photo straight from Postgres (BYTEA) — Render has no
 * persistent disk, so uploaded media lives in the DB. Ids are immutable so
 * responses cache forever in the browser and for a week at the CDN.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse(null, { status: 400 });

  // Ids are immutable — serve hot media from process memory instead of
  // streaming the blob out of Postgres on every browser-cache miss (range
  // requests below slice from the same cached buffer).
  let media = getCachedBlob(`cm:${id}`);
  if (!media) {
    const row = await getChatMedia(id);
    if (!row) return new NextResponse(null, { status: 404 });
    putCachedBlob(`cm:${id}`, row.bytes, row.mime);
    media = { bytes: row.bytes, mime: row.mime };
  }

  const total = media.bytes.length;
  const headers = new Headers({
    "Content-Type": media.mime || "image/jpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control":
      "public, max-age=31536000, immutable, s-maxage=604800, stale-while-revalidate=86400",
  });

  // Byte-range support: Safari/iOS insists on 206 responses for <audio>
  // (voice notes) and will refuse to play — or to seek — without them.
  const range = req.headers.get("range");
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (m && (m[1] !== "" || m[2] !== "")) {
    let start: number;
    let end: number;
    if (m[1] === "") {
      // suffix form: bytes=-N (last N bytes)
      const suffix = Math.min(Number(m[2]), total);
      start = total - suffix;
      end = total - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
      headers.set("Content-Range", `bytes */${total}`);
      return new NextResponse(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
    headers.set("Content-Length", String(end - start + 1));
    return new NextResponse(new Uint8Array(media.bytes.subarray(start, end + 1)), {
      status: 206,
      headers,
    });
  }

  headers.set("Content-Length", String(total));
  return new NextResponse(new Uint8Array(media.bytes), {
    status: 200,
    headers,
  });
}
