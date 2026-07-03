import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  editChatMessage,
  getMessageEditInfo,
  getChatMemberModState,
  matchBlocklist,
  recordAction,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 2000;

/**
 * POST /api/community/chat/edit — edit a message body in place.
 *
 * A member may edit their OWN live message; an admin may edit any. The message
 * must still be live (a deleted message can't be resurrected). Non-admin edits
 * re-run the length + word-blocklist gates exactly like a fresh post, so an
 * edit can never smuggle past moderation. On success the refreshed message is
 * returned and edited_at is stamped so the bubble shows the "edited" mark.
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "Sign in with Telegram to edit" },
      { status: 401 },
    );
  }

  let payload: { id?: unknown; body?: unknown };
  try {
    payload = (await req.json()) as { id?: unknown; body?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const id =
    (typeof payload.id === "string" || typeof payload.id === "number") &&
    /^\d+$/.test(String(payload.id))
      ? String(payload.id)
      : null;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing message id" },
      { status: 400 },
    );
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Message is empty" },
      { status: 400 },
    );
  }
  if (body.length > MAX_BODY) {
    return NextResponse.json(
      { ok: false, error: "Message is too long" },
      { status: 400 },
    );
  }

  const info = await getMessageEditInfo(id);
  if (!info || info.deleted) {
    return NextResponse.json(
      { ok: false, error: "Message not found" },
      { status: 404 },
    );
  }
  if (!me.admin && info.tgId !== me.tid) {
    return NextResponse.json(
      { ok: false, error: "You can only edit your own messages" },
      { status: 403 },
    );
  }

  // Banned/muted members can't edit either (parity with posting).
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

  // Word blocklist applies to non-admins only (same as a fresh post).
  if (!me.admin) {
    const hit = await matchBlocklist(body);
    if (hit) {
      await recordAction({
        actorTgId: me.tid,
        actorName: me.name,
        action: "blocked-message",
        target: me.tid,
        meta: { word: hit, edit: true },
      }).catch(() => undefined);
      return NextResponse.json(
        { ok: false, error: "Your message contains a blocked word." },
        { status: 403 },
      );
    }
  }

  const message = await editChatMessage(id, body, me.tid);
  if (!message) {
    return NextResponse.json(
      { ok: false, error: "Message not found" },
      { status: 404 },
    );
  }

  await recordAction({
    actorTgId: me.tid,
    actorName: me.name,
    action: "edit-message",
    target: info.tgId,
    meta: { id },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, message });
}
