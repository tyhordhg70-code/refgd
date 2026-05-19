import { NextRequest, NextResponse } from "next/server";

  const SPAWNGC = "https://spawngc.gg";
  const CLEARBIT = "https://logo.clearbit.com";

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
        next: { revalidate: 86400 },
      });
      if (!upstream.ok) return new NextResponse(null, { status: upstream.status });
      const ct = upstream.headers.get("content-type") || "image/png";
      const buf = await upstream.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": ct,
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    } catch {
      return new NextResponse(null, { status: 502 });
    }
  }
  