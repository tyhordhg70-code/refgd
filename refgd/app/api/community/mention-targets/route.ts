import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { listMentionTargets } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → display names the composer's @-autocomplete can offer.
 *
 * Members only (any signed-in member, not just admins) and NAMES ONLY: unlike
 * /api/community/members this deliberately exposes neither numeric Telegram
 * ids nor @usernames — display names are already public on every bubble, so
 * this leaks nothing the chat doesn't. The server re-matches typed `@Name`
 * text against the live roster on POST/edit, so this list is purely a typing
 * aid — a stale or hand-typed name simply stays plain text.
 */
export async function GET() {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "Sign in with Telegram" },
      { status: 401 },
    );
  }
  const targets = await listMentionTargets();
  return NextResponse.json({ ok: true, names: targets.map((t) => t.name) });
}
