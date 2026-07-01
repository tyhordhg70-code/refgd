import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { getCommunityBotUsername } from "@/lib/community-bot";
import {
  listChatMessages,
  createChatMessage,
  upsertChatMember,
  countChatMembers,
  getChatMemberModState,
  secondsSinceLastMessage,
  getModConfig,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 2000;
/** Minimum gap (seconds) between one member's messages — basic flood guard. */
const MIN_POST_GAP_S = 2;

/**
 * GET  → chat state: recent messages (or only those after `?after=<id>` when
 *        short-polling), the current member (if signed in), the live member
 *        count (unless the admin has hidden it) and the community bot username
 *        (needed to render the Telegram Login Widget).
 *
 * Reading the chat is public — it is the "window into the group". Loading it
 * while signed in also refreshes the member's presence (a lightweight join).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const after = url.searchParams.get("after");

  const me = await readMemberSession();
  // Refresh presence on the full load (no `after`) only — skip it on the 2.5s
  // short-poll to avoid a write on every tick across all clients.
  if (me && !after) {
    await upsertChatMember({
      tgId: me.tid,
      name: me.name,
      photo: me.photo,
      isAdmin: me.admin,
    }).catch(() => undefined);
  }

  const [messages, memberCount, hideMembers, botUsername] = await Promise.all([
    listChatMessages({ afterId: after, viewerTid: me?.tid ?? null }),
    countChatMembers(),
    getModConfig<boolean>("chat_hide_members", false),
    getCommunityBotUsername(),
  ]);

  const showCount = !hideMembers || Boolean(me?.admin);

  return NextResponse.json({
    me,
    messages,
    memberCount: showCount ? memberCount : null,
    hideMembers,
    botUsername,
  });
}

/** POST → post a message (members only; banned/muted members are blocked). */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "Sign in with Telegram to chat" },
      { status: 401 },
    );
  }

  let payload: { text?: unknown };
  try {
    payload = (await req.json()) as { text?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Message is empty" },
      { status: 400 },
    );
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json(
      { ok: false, error: "Message is too long" },
      { status: 400 },
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

  const since = await secondsSinceLastMessage(me.tid);
  if (since !== null && since < MIN_POST_GAP_S) {
    return NextResponse.json(
      { ok: false, error: "You're sending messages too fast — slow down." },
      { status: 429 },
    );
  }

  await upsertChatMember({
    tgId: me.tid,
    name: me.name,
    photo: me.photo,
    isAdmin: me.admin,
  }).catch(() => undefined);

  const message = await createChatMessage({
    tgId: me.tid,
    authorName: me.name,
    body: text,
  });

  return NextResponse.json({ ok: true, message });
}
