import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyMiniAppInitDataDetailed,
  diagnoseInitDataHmac,
  verifyInitDataEd25519,
  createMemberSession,
  readMemberSession,
  clearMemberSession,
  type MiniAppAuthFailReason,
  type MiniAppAuthDebug,
} from "@/lib/community-auth";
import {
  getCommunityBotUsername,
  getBotIdentityFromToken,
} from "@/lib/community-bot";
import {
  isValidInviteSlug,
  recordInviteJoin,
  upsertChatMember,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/community/auth — current member session (or { member: null }). */
export async function GET() {
  const member = await readMemberSession();
  return NextResponse.json({ member });
}

/**
 * POST /api/community/auth — sign in with a verified Telegram identity.
 * Members-only by owner decision: ONLY Mini App initData is accepted (the
 * chat is writable exclusively from inside Telegram; the web view is
 * read-only). On success sets the rg_member cookie and returns the member.
 */
export async function POST(req: Request) {
  let body: { initData?: unknown };
  try {
    body = (await req.json()) as { initData?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  let member = null;
  let failReason: MiniAppAuthFailReason | null = null;
  let authDebug: MiniAppAuthDebug | undefined;
  if (typeof body.initData === "string" && body.initData) {
    const detailed = verifyMiniAppInitDataDetailed(body.initData);
    member = detailed.member;
    failReason = detailed.reason;
    authDebug = detailed.debug;
  } else {
    return NextResponse.json(
      { ok: false, error: "This chat is Telegram members only — open it inside Telegram." },
      { status: 403 },
    );
  }

  if (!member) {
    // Surface WHY (and which bot the server's token actually belongs to) so
    // a token↔bot mismatch is diagnosable from the phone instead of a
    // generic "verification failed".
    const serverBot =
      failReason === "bad_signature" || failReason === "no_token"
        ? await getCommunityBotUsername().catch(() => null)
        : null;
    // On a signature failure with a clean token the ONLY remaining cause is a
    // token↔bot mismatch. COMMUNITY_BOT_USERNAME is set independently and can
    // lie, so ask Telegram which bot the TOKEN actually is (getMe). If that bot
    // differs from the one whose Mini App opened this app, HMAC can never match.
    const actualBot =
      failReason === "bad_signature"
        ? await getBotIdentityFromToken().catch((e) => ({
            ok: false as const,
            error: String(e),
          }))
        : null;
    // Recompute the hash under several algorithm variants against the SAME
    // token. A matching variant = an encoding bug in code; `none` = the payload
    // was signed by a different token than the one on the server.
    const hmacDiag =
      failReason === "bad_signature" && typeof body.initData === "string"
        ? diagnoseInitDataHmac(body.initData)
        : null;
    // TOKEN-INDEPENDENT proof: verify the Ed25519 `signature` against Telegram's
    // public key for the id the server's token REALLY is (getMe). This settles
    // whether the initData was genuinely issued FOR this bot, with no reliance on
    // the token value at all.
    const edDiag =
      failReason === "bad_signature" &&
      typeof body.initData === "string" &&
      actualBot &&
      actualBot.ok
        ? verifyInitDataEd25519(body.initData, actualBot.id)
        : null;
    const actualBotStr = !actualBot
      ? ""
      : actualBot.ok
        ? ` The server's token is valid and belongs to @${actualBot.username ?? actualBot.id} (not revoked).`
        : ` The server could not confirm its token with Telegram (${actualBot.error}) — the token is invalid or revoked; re-copy it from BotFather.`;
    // Build the actionable verdict. Prefer the Ed25519 proof when present because
    // it is decisive and token-independent:
    //  • ed valid  + HMAC fail ⇒ this IS genuine Telegram data for THIS bot, so
    //    the server's TOKEN VALUE differs from the one that signed it (two tokens
    //    for the same bot) → re-copy the current token from BotFather + redeploy.
    //  • ed invalid            ⇒ the launch was issued for a DIFFERENT bot → the
    //    Mini App button that opened this belongs to another bot.
    // If Ed25519 is absent (older client sends no `signature`), fall back to the
    // multi-variant HMAC recompute: an alternate variant = an encoding bug in our
    // code; `none` = signed by a token the server doesn't have.
    const botLabel = actualBot && actualBot.ok
      ? `@${actualBot.username ?? actualBot.id} (id ${actualBot.id})`
      : "this bot";
    const edStr = !edDiag || !edDiag.present
      ? ""
      : edDiag.valid === true
        ? ` VERIFIED: this sign-in is genuine Telegram data issued for ${botLabel}, but it does NOT match the server's copy of that bot's token — the server holds a DIFFERENT token value for the same bot. Open the bot in BotFather, copy its CURRENT token, set it as COMMUNITY_BOT_TOKEN on the server, and redeploy.`
        : edDiag.valid === false
          ? ` VERIFIED: this sign-in was issued for a DIFFERENT bot than ${botLabel} — the Mini App button you opened belongs to another bot. Open the community through ${botLabel}'s Mini App button, or set COMMUNITY_BOT_TOKEN to the token of the bot whose button you tap.`
          : "";
    // HMAC fallback only when Ed25519 gave no answer (no signature field).
    const hmacStr = edStr
      ? ""
      : !hmacDiag
        ? ""
        : hmacDiag.match === "none"
          ? " The sign-in could not be validated against the server's token under any known method — the token that signed it is not the one on the server."
          : hmacDiag.match === "miniapp_excl_both_dec"
            ? ""
            : ` The data actually validates under an alternate encoding (${hmacDiag.match}) — this is a server-side code fix, not a token problem.`;
    const human: Record<string, string> = {
      no_token:
        "The server has no community bot token configured — set COMMUNITY_BOT_TOKEN.",
      no_hash: "Telegram didn't include a signature in the sign-in payload.",
      bad_signature:
        (serverBot
          ? `Signature check failed — the server is configured for @${serverBot}.`
          : "Signature check failed — the server couldn't validate this session against COMMUNITY_BOT_TOKEN.") +
        actualBotStr +
        hmacStr +
        (authDebug?.tokenHadWhitespace
          ? " (The configured token also has surrounding whitespace — re-paste it with no spaces or newlines.)"
          : ""),
      stale_auth_date:
        "This Telegram session is stale — close and reopen the mini app.",
      no_user: "No Telegram user was included in the sign-in payload.",
    };
    return NextResponse.json(
      {
        ok: false,
        error: human[failReason ?? ""] ?? "Telegram verification failed",
        reason: failReason,
        // Non-sensitive diagnostics (no token material / no user PII) so a
        // "same token but signature fails" report can be pinpointed remotely.
        // `serverBotActual` is the bot the token REALLY is (getMe), vs the
        // `serverBot`/COMMUNITY_BOT_USERNAME label which is set independently.
        debug: authDebug
          ? { ...authDebug, serverBot, serverBotActual: actualBot, hmac: hmacDiag, ed: edDiag }
          : { serverBot, serverBotActual: actualBot, hmac: hmacDiag, ed: edDiag },
      },
      { status: 401 },
    );
  }

  await createMemberSession(member);

  // Persist the member row NOW — including their @username, which only
  // exists in the verified initData (the session JWT never carries it). This
  // is what lets admins target `/ban @user` even before the member posts.
  // Fail-soft: presence writes must never break sign-in.
  await upsertChatMember({
    tgId: member.tid,
    name: member.name,
    photo: member.photo,
    isAdmin: member.admin,
    username: member.username ?? null,
  }).catch(() => undefined);

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
