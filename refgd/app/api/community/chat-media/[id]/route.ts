import { NextResponse } from "next/server";
import {
  getChatMedia,
  getChatMediaMeta,
  getChatMediaSlice,
} from "@/lib/community";
import {
  getCachedBlob,
  putCachedBlob,
  BLOB_CACHE_ENTRY_CAP,
} from "@/lib/blob-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SQL-chunk size when streaming a large blob without a Range header. */
const STREAM_CHUNK = 1024 * 1024;

/**
 * Max bytes served per 206 slice of a large blob. Browsers open playback with
 * `Range: bytes=0-` (open-ended); satisfying that literally would materialize
 * the entire clip out of Postgres per play. RFC 9110 allows a 206 to carry a
 * shorter range than requested; clients keep issuing follow-up ranges, so
 * only the bytes actually watched leave the DB.
 */
const RANGE_SLICE_CAP = 4 * 1024 * 1024;

const CACHE_CONTROL =
  "public, max-age=31536000, immutable, s-maxage=604800, stale-while-revalidate=86400";

function parseRange(
  req: Request,
  total: number,
): { start: number; end: number } | "invalid" | null {
  const range = req.headers.get("range");
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (!m || (m[1] === "" && m[2] === "")) return null;
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
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start > end ||
    start >= total
  ) {
    return "invalid";
  }
  return { start, end };
}

/**
 * Document (kind='file') downloads: uploaded bytes are user-controlled, so
 * they are NEVER served inline under their stored mime (a text/html or SVG
 * blob rendered same-origin would be stored XSS). Force a download with a
 * generic content type and a header-safe filename (ASCII fallback plus RFC
 * 5987 filename* for the original UTF-8 name — CR/LF/quotes stripped so the
 * stored name can't inject headers).
 */
function fileHeaders(headers: Headers, name: string | null) {
  headers.set("Content-Type", "application/octet-stream");
  headers.set("X-Content-Type-Options", "nosniff");
  const raw = (name || "file").replace(/[\r\n"\\]/g, "").slice(0, 128);
  const ascii = raw.replace(/[^\x20-\x7e]/g, "_") || "file";
  headers.set(
    "Content-Disposition",
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(raw)}`,
  );
}

/**
 * GET /api/community/chat-media/[id]
 *
 * Serves chat attachments (photos, voice notes, video posters, video clips
 * and documents) straight from Postgres (BYTEA) — Render has no persistent
 * disk, so uploaded media lives in the DB. Ids are immutable so responses
 * cache forever in the browser and for a week at the CDN.
 *
 * Two serving paths, split on the blob-cache entry cap (same pattern as
 * /api/community/media/[id]):
 * - Small blobs (photos, posters, voice): load fully once, pin in the
 *   in-process LRU, answer full and range requests from memory.
 * - Large blobs (video clips, documents — the LRU rejects them): NEVER pull
 *   the full blob per request. Range requests are sliced inside Postgres
 *   (substring on BYTEA); rangeless requests stream in fixed SQL chunks.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse(null, { status: 400 });

  // Ids are immutable — serve hot small media from process memory instead of
  // streaming the blob out of Postgres on every browser-cache miss.
  let media = getCachedBlob(`cm:${id}`);
  let fileName: string | null = null;
  let isFile = false;
  if (!media) {
    const meta = await getChatMediaMeta(id);
    if (!meta) return new NextResponse(null, { status: 404 });
    fileName = meta.name;
    isFile = meta.kind === "file";

    if (meta.total > BLOB_CACHE_ENTRY_CAP) {
      // Large blob (video clip / document): serve without materializing it.
      const headers = new Headers({
        "Content-Type": meta.mime || "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Cache-Control": CACHE_CONTROL,
      });
      if (isFile) fileHeaders(headers, fileName);
      const r = parseRange(req, meta.total);
      if (r === "invalid") {
        headers.set("Content-Range", `bytes */${meta.total}`);
        return new NextResponse(null, { status: 416, headers });
      }
      if (r) {
        // Clamp oversized/open-ended ranges to the slice cap (shorter 206).
        const end = Math.min(r.end, r.start + RANGE_SLICE_CAP - 1);
        const chunk = await getChatMediaSlice(id, r.start, end - r.start + 1);
        if (!chunk) return new NextResponse(null, { status: 404 });
        headers.set(
          "Content-Range",
          `bytes ${r.start}-${r.start + chunk.length - 1}/${meta.total}`,
        );
        headers.set("Content-Length", String(chunk.length));
        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers,
        });
      }
      // No Range header: stream the whole blob in SQL-sized chunks.
      let offset = 0;
      const total = meta.total;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (offset >= total) {
            controller.close();
            return;
          }
          const len = Math.min(STREAM_CHUNK, total - offset);
          const chunk = await getChatMediaSlice(id, offset, len);
          if (!chunk || chunk.length === 0) {
            controller.error(new Error("media chunk read failed"));
            return;
          }
          offset += chunk.length;
          controller.enqueue(new Uint8Array(chunk));
        },
      });
      headers.set("Content-Length", String(total));
      return new NextResponse(stream, { status: 200, headers });
    }

    // Small blob: load once, cache, fall through to the in-memory path.
    const row = await getChatMedia(id);
    if (!row) return new NextResponse(null, { status: 404 });
    putCachedBlob(`cm:${id}`, row.bytes, row.mime);
    media = { bytes: row.bytes, mime: row.mime };
  } else {
    // Cache hit can still be a small document — its download headers depend
    // on kind/name, which the blob cache doesn't carry. Meta reads are a
    // cheap indexed lookup (no blob bytes leave Postgres).
    const meta = await getChatMediaMeta(id);
    if (meta?.kind === "file") {
      fileName = meta.name;
      isFile = true;
    }
  }

  const total = media.bytes.length;
  const headers = new Headers({
    "Content-Type": media.mime || "image/jpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": CACHE_CONTROL,
  });
  if (isFile) fileHeaders(headers, fileName);

  // Byte-range support: Safari/iOS insists on 206 responses for <audio>
  // (voice notes) and will refuse to play — or to seek — without them.
  const r = parseRange(req, total);
  if (r === "invalid") {
    headers.set("Content-Range", `bytes */${total}`);
    return new NextResponse(null, { status: 416, headers });
  }
  if (r) {
    headers.set("Content-Range", `bytes ${r.start}-${r.end}/${total}`);
    headers.set("Content-Length", String(r.end - r.start + 1));
    return new NextResponse(
      new Uint8Array(media.bytes.subarray(r.start, r.end + 1)),
      { status: 206, headers },
    );
  }

  headers.set("Content-Length", String(total));
  return new NextResponse(new Uint8Array(media.bytes), {
    status: 200,
    headers,
  });
}
