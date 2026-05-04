import { NextRequest, NextResponse } from "next/server";

  const SRC = "https://spawngc.gg";

  export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
  ) {
    const { path } = await params;
    const target = `${SRC}/${path.join("/")}`;
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
  