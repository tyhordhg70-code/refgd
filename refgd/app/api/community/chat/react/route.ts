import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  toggleReaction,
  chatMessageExists,
  getChatMemberModState,
  CHAT_REACTION_EMOJI,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST → toggle the caller's reaction on a message (members only). */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "Sign in with Telegram to react" },
      { status: 401 },
    );
  }

  let payload: { messageId?: unknown; emoji?: unknown };
  try {
    payload = (await req.json()) as { messageId?: unknown; emoji?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const messageId =
    typeof payload.messageId === "string" || typeof payload.messageId === "number"
      ? String(payload.messageId)
      : "";
  const emoji = typeof payload.emoji === "string" ? payload.emoji : "";

  if (!/^\d+$/.test(messageId)) {
    return NextResponse.json(
      { ok: false, error: "Bad message id" },
      { status: 400 },
    );
  }
  if (!CHAT_REACTION_EMOJI.includes(emoji)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported reaction" },
      { status: 400 },
    );
  }
  if (!(await chatMessageExists(messageId))) {
    return NextResponse.json(
      { ok: false, error: "No such message" },
      { status: 404 },
    );
  }

  const mod = await getChatMemberModState(me.tid);
  if (mod.isBanned) {
    return NextResponse.json(
      { ok: false, error: "You are banned from the chat" },
      { status: 403 },
    );
  }
  if (mod.mutedUntil && new Date(mod.mutedUntil).getTime() > Date.now()) {
    return NextResponse.json(
      { ok: false, error: "You are muted" },
      { status: 403 },
    );
  }

  const reactions = await toggleReaction(messageId, me.tid, emoji);
  return NextResponse.json({ ok: true, messageId, reactions });
}
