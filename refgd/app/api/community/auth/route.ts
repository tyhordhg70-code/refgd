import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyMiniAppInitDataDetailed,
  verifyLoginWidget,
  createMemberSession,
  readMemberSession,
  clearMemberSession,
  type MiniAppAuthFailReason,
} from "@/lib/community-auth";
import { getCommunityBotUsername } from "@/lib/community-bot";
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
  let failReason: MiniAppAuthFailReason | "widget_failed" | null = null;
  if (typeof body.initData === "string" && body.initData) {
    const detailed = verifyMiniAppInitDataDetailed(body.initData);
    member = detailed.member;
    failReason = detailed.reason;
  } else if (body.widget && typeof body.widget === "object") {
    member = verifyLoginWidget(body.widget as Record<string, unknown>);
    if (!member) failReason = "widget_failed";
  } else {
    return NextResponse.json(
      { ok: false, error: "Provide initData or widget" },
      { status: 400 },
    );
  }

  if (!member) {
    // Surface WHY (and which bot the server's token actually belongs to) so
    // a token↔bot mismatch is diagnosable from the phone instead of a
    // generic "verification failed".
    const serverBot =
      failReason === "bad_signature" ||
      failReason === "no_token" ||
      failReason === "widget_failed"
        ? await getCommunityBotUsername().catch(() => null)
        : null;
    const human: Record<string, string> = {
      no_token:
        "The server has no community bot token configured — set COMMUNITY_BOT_TOKEN.",
      no_hash: "Telegram didn't include a signature in the sign-in payload.",
      bad_signature: serverBot
        ? `Signature check failed — this app was opened from a different bot than the server is configured for (@${serverBot}). Open it via @${serverBot}.`
        : "Signature check failed — the server's COMMUNITY_BOT_TOKEN doesn't match the bot that opened this app.",
      stale_auth_date:
        "This Telegram session is stale — close and reopen the mini app.",
      no_user: "No Telegram user was included in the sign-in payload.",
      widget_failed: serverBot
        ? `Telegram login check failed — make sure the login widget belongs to @${serverBot} and the site domain is set via BotFather /setdomain.`
        : "Telegram login check failed.",
    };
    return NextResponse.json(
      {
        ok: false,
        error: human[failReason ?? ""] ?? "Telegram verification failed",
        reason: failReason,
      },
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
