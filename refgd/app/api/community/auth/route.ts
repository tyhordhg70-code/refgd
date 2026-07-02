import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyMiniAppInitData,
  verifyLoginWidget,
  createMemberSession,
  readMemberSession,
  clearMemberSession,
} from "@/lib/community-auth";
import { isValidInviteSlug, recordInviteJoin } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/community/auth — current member session (or { member: null }). */
export async function GET() {
  const member = await readMemberSession();
  return NextResponse.json({ member });
}

/**
 * POST /api/community/auth — sign in with a verified Telegram identity.
 * Body is either { initData: string } (Mini App) or { widget: {...} } (Login
 * Widget). On success sets the rg_member cookie and returns the member.
 */
export async function POST(req: Request) {
  let body: { initData?: unknown; widget?: unknown };
  try {
    body = (await req.json()) as { initData?: unknown; widget?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  let member = null;
  if (typeof body.initData === "string" && body.initData) {
    member = verifyMiniAppInitData(body.initData);
  } else if (body.widget && typeof body.widget === "object") {
    member = verifyLoginWidget(body.widget as Record<string, unknown>);
  } else {
    return NextResponse.json(
      { ok: false, error: "Provide initData or widget" },
      { status: 400 },
    );
  }

  if (!member) {
    return NextResponse.json(
      { ok: false, error: "Telegram verification failed" },
      { status: 401 },
    );
  }

  await createMemberSession(member);

  // Attribute a join to the invite link that brought them in (if any), then
  // clear the cookie so re-signing-in doesn't re-attribute. De-duped per
  // tg_id in recordInviteJoin, so this is safe even if the cookie lingers.
  const res = NextResponse.json({ ok: true, member });
  try {
    const jar = await cookies();
    const slug = jar.get("rg_invite")?.value;
    if (slug && isValidInviteSlug(slug) && member.tid) {
      await recordInviteJoin(slug, member.tid).catch(() => undefined);
      res.cookies.set("rg_invite", "", { path: "/", maxAge: 0 });
    }
  } catch {
    // never let attribution break sign-in
  }
  return res;
}

/** DELETE /api/community/auth — sign out. */
export async function DELETE() {
  await clearMemberSession();
  return NextResponse.json({ ok: true });
}
