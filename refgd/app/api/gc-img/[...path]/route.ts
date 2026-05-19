import { NextRequest, NextResponse } from "next/server";

  const SPAWNGC = "https://spawngc.gg";
  const CLEARBIT = "https://logo.clearbit.com";

  export const runtime = "nodejs";
  export const dynamic = "force-static";
  export const revalidate = 604800; // 7 days

  export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
  ) {
    const { path } = await params;
    const isLogo = path[0] === "logo";
    const target = isLogo
      ? `${CLEARBIT}/${path.slice(1).join("/")}`
      : `${SPAWNGC}/${path.join("/")}`;

    try {
      const upstream = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
        cache: "force-cache",
      });
      if (!upstream.ok || !upstream.body) {
        return new NextResponse(null, { status: upstream.status || 502 });
      }

      const headers = new Headers({
        "Content-Type": upstream.headers.get("content-type") || "image/png",
        // Browser: cache forever (URL is content-addressed by UUID)
        // CDN (Render / Cloudflare in front): cache 7 days, serve stale while revalidating
        "Cache-Control":
          "public, max-age=31536000, immutable, s-maxage=604800, stale-while-revalidate=86400",
      });
      const cl = upstream.headers.get("content-length");
      if (cl) headers.set("Content-Length", cl);
      const etag = upstream.headers.get("etag");
      if (etag) headers.set("ETag", etag);

      // Stream the body straight through — no buffering, first byte ships immediately.
      return new NextResponse(upstream.body, { status: 200, headers });
    } catch {
      return new NextResponse(null, { status: 502 });
    }
  }
  