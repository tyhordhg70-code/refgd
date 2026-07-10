import { NextResponse } from "next/server";
import {
  getVouchMedia,
  getVouchMediaMeta,
  getVouchMediaSlice,
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
 * the entire clip out of Postgres per play — the exact egress pattern the
 * split serving paths exist to avoid. RFC 9110 allows a 206 to carry a
 * shorter range than requested; clients keep issuing follow-up ranges for
 * the rest, so only the bytes actually watched leave the DB.
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
 * GET /api/community/media/[id]
 *
 * Serves vouch media (photos, video posters and the mp4 clips themselves)
 * straight from Postgres (BYTEA) — Render has no persistent disk, so uploaded
 * media lives in the DB. Each id is immutable and content-addressed, so
 * responses are cached forever by the browser and for a week at the CDN.
 *
 * Two serving paths, split on the blob-cache entry cap:
 * - Small blobs (photos, posters): load fully once, pin in the in-process
 *   LRU, and answer both full and range requests from memory.
 * - Large blobs (video clips, 10MB+ — the LRU rejects them): NEVER pull the
 *   full blob per request. Range requests are sliced inside Postgres
 *   (substring on BYTEA) so only the requested window leaves the DB;
 *   Safari/iOS fires several range probes per playback and a full
 *   `SELECT bytes` for each one is exactly the egress pattern that
 *   previously exhausted the data-transfer quota. Rangeless requests are
 *   streamed in fixed SQL chunks instead of buffering the clip in memory.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse(null, { status: 400 });

  // Hot small media served straight from process memory.
  let media = getCachedBlob(`vm:${id}`);
  if (!media) {
    const meta = await getVouchMediaMeta(id);
    if (!meta) return new NextResponse(null, { status: 404 });

    if (meta.total > BLOB_CACHE_ENTRY_CAP) {
      // Large blob (video): serve without ever materializing all of it.
      const headers = new Headers({
        "Content-Type": meta.mime || "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": CACHE_CONTROL,
      });
      const r = parseRange(req, meta.total);
      if (r === "invalid") {
        headers.set("Content-Range", `bytes */${meta.total}`);
        return new NextResponse(null, { status: 416, headers });
      }
      if (r) {
        // Clamp oversized/open-ended ranges to the slice cap (shorter 206).
        const end = Math.min(r.end, r.start + RANGE_SLICE_CAP - 1);
        const chunk = await getVouchMediaSlice(id, r.start, end - r.start + 1);
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
      // No Range header: stream the whole clip in SQL-sized chunks.
      let offset = 0;
      const total = meta.total;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (offset >= total) {
            controller.close();
            return;
          }
          const len = Math.min(STREAM_CHUNK, total - offset);
          const chunk = await getVouchMediaSlice(id, offset, len);
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
    const row = await getVouchMedia(id);
    if (!row) return new NextResponse(null, { status: 404 });
    putCachedBlob(`vm:${id}`, row.bytes, row.mime);
    media = { bytes: row.bytes, mime: row.mime };
  }

  const total = media.bytes.length;
  const headers = new Headers({
    "Content-Type": media.mime || "image/jpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": CACHE_CONTROL,
  });

  // Byte-range support: Safari/iOS insists on 206 responses for <video> and
  // will refuse to play — or to seek — without them.
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
