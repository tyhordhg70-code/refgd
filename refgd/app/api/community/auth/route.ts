import { NextResponse } from "next/server";
import {
  verifyMiniAppInitData,
  verifyLoginWidget,
  createMemberSession,
  readMemberSession,
  clearMemberSession,
} from "@/lib/community-auth";

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
  return NextResponse.json({ ok: true, member });
}

/** DELETE /api/community/auth — sign out. */
export async function DELETE() {
  await clearMemberSession();
  return NextResponse.json({ ok: true });
}
