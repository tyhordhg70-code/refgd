import { NextResponse } from "next/server";
import { getVouchMedia } from "@/lib/community";
import { getCachedBlob, putCachedBlob } from "@/lib/blob-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/community/media/[id]
 *
 * Serves a vouch photo straight from Postgres (BYTEA) — Render has no
 * persistent disk, so uploaded media lives in the DB. Each id is immutable
 * and content-addressed, so responses are cached forever by the browser and
 * for a week at the CDN.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse(null, { status: 400 });

  // Ids are immutable — serve hot images from process memory instead of
  // streaming the blob out of Postgres on every browser-cache miss.
  let media = getCachedBlob(`vm:${id}`);
  if (!media) {
    const row = await getVouchMedia(id);
    if (!row) return new NextResponse(null, { status: 404 });
    putCachedBlob(`vm:${id}`, row.bytes, row.mime);
    media = { bytes: row.bytes, mime: row.mime };
  }

  const headers = new Headers({
    "Content-Type": media.mime || "image/jpeg",
    "Content-Length": String(media.bytes.length),
    "Cache-Control":
      "public, max-age=31536000, immutable, s-maxage=604800, stale-while-revalidate=86400",
  });
  return new NextResponse(new Uint8Array(media.bytes), { status: 200, headers });
}
