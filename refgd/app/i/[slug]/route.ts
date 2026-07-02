import { NextResponse } from "next/server";
import { isValidInviteSlug, recordInviteClick } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /i/<slug> — public invite link.
 *
 * Records a click, drops a short-lived `rg_invite` cookie so the join can be
 * attributed when the visitor signs in (see /api/community/auth), then 302s
 * into /community. Unknown/invalid slugs still redirect (no error surface) but
 * are not tracked.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await params;
  const slug = typeof raw === "string" ? raw.toLowerCase() : "";
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(new URL("/community", origin), 302);

  if (isValidInviteSlug(slug)) {
    await recordInviteClick(slug).catch(() => undefined);
    res.cookies.set("rg_invite", slug, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }
  return res;
}
