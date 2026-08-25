import { NextResponse } from "next/server";
import { isVouchSection, listVouches } from "@/lib/community";

export const dynamic = "force-dynamic";

/**
 * Refresh one read-only community topic without reloading the Mini App shell.
 * The page's initial vouches are server props, but the bot can add new rows
 * while a client session remains open for hours.
 */
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get("section");
  if (!isVouchSection(section)) {
    return NextResponse.json(
      { ok: false, error: "Invalid vouch section" },
      { status: 400 },
    );
  }

  try {
    const vouches = await listVouches(section);
    const response = NextResponse.json({ ok: true, vouches });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't load vouches" },
      { status: 503 },
    );
  }
}