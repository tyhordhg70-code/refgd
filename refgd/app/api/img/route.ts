import { NextRequest, NextResponse } from "next/server";

/**
 * Generic cached image proxy.
 *
 * Used by <EditableImage> for every remote (admin-pasted) image on the
 * public render path. Two wins:
 *   1. Caching — we attach a long, immutable Cache-Control so the browser
 *      and any CDN in front of Render keep the bytes instead of re-fetching
 *      the original host on every page view (attraction / brand photos).
 *   2. Hot-link fixes — the fetch happens server-side with no browser
 *      Referer, so hosts that block cross-origin hot-linking (which show as
 *      "broken image" in the browser) load fine through here.
 *
 * On any failure (bad URL, upstream error, non-image response) we 302 to
 * the original URL so behaviour never regresses below "load it directly".
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new NextResponse(null, { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*,*/*" },
      cache: "force-cache",
    });

    const ct = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !upstream.body || !ct.startsWith("image/")) {
      // Let the browser try the original directly.
      return NextResponse.redirect(target.toString(), 302);
    }

    const headers = new Headers({
      "Content-Type": ct,
      // Browser: cache effectively forever (image URLs are stable).
      // CDN: 7 days, serve stale while revalidating.
      "Cache-Control":
        "public, max-age=31536000, immutable, s-maxage=604800, stale-while-revalidate=86400",
    });
    const cl = upstream.headers.get("content-length");
    if (cl) headers.set("Content-Length", cl);
    const etag = upstream.headers.get("etag");
    if (etag) headers.set("ETag", etag);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.redirect(target.toString(), 302);
  }
}
