import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  createPollWithMessage,
  getChatMemberModState,
  getModConfig,
  matchBlocklist,
  recordAction,
  secondsSinceLastMessage,
  upsertChatMember,
  isChatTopic,
  isNotifCategory,
  claimNotifySlot,
  POLL_QUESTION_MAX,
  POLL_OPTION_MAX,
  POLL_OPTIONS_MAX,
  type ChatTopic,
} from "@/lib/community";
import { notifyCategory } from "@/lib/community-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_POST_GAP_S = 2;
/** Polls posted into the live group chat share its 7-day auto-delete. */
const DEFAULT_TTL_S = 604_800;

/**
 * POST → create a poll and post its [poll:<id>] message in one shot (members
 * only). Runs the same moderation gates as a normal chat message: readme
 * write-lock, ban, mute, blocklist (question + options, non-admins), flood.
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "Sign in with Telegram to chat" },
      { status: 401 },
    );
  }

  let payload: {
    topic?: unknown;
    question?: unknown;
    options?: unknown;
    multiple?: unknown;
  };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const topic: ChatTopic = isChatTopic(payload.topic) ? payload.topic : "chat";
  if (topic === "readme" && !me.admin) {
    return NextResponse.json(
      { ok: false, error: "This topic is read-only." },
      { status: 403 },
    );
  }

  const question =
    typeof payload.question === "string" ? payload.question.trim() : "";
  const optionsRaw = Array.isArray(payload.options) ? payload.options : [];
  const options = optionsRaw
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter(Boolean)
    .slice(0, POLL_OPTIONS_MAX);
  const multiple = payload.multiple === true;

  if (!question || options.length < 2) {
    return NextResponse.json(
      { ok: false, error: "A poll needs a question and at least 2 options" },
      { status: 400 },
    );
  }
  if (
    question.length > POLL_QUESTION_MAX ||
    options.some((o) => o.length > POLL_OPTION_MAX)
  ) {
    return NextResponse.json(
      { ok: false, error: "Poll text is too long" },
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

  // Blocklist covers the question AND every option for non-admins.
  if (!me.admin) {
    const hit = await matchBlocklist([question, ...options].join("\n"));
    if (hit) {
      await recordAction({
        actorTgId: me.tid,
        actorName: me.name,
        action: "blocked-message",
        target: me.tid,
        meta: { word: hit },
      }).catch(() => undefined);
      return NextResponse.json(
        { ok: false, error: "Your poll contains a blocked word." },
        { status: 403 },
      );
    }
  }

  const floodGap = await getModConfig<number>("flood_gap_s", MIN_POST_GAP_S);
  const since = await secondsSinceLastMessage(me.tid);
  if (floodGap > 0 && since !== null && since < floodGap) {
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

  const expiresAt =
    topic === "chat" ? new Date(Date.now() + DEFAULT_TTL_S * 1000) : null;

  let message;
  try {
    message = await createPollWithMessage({
      tgId: me.tid,
      authorName: me.name,
      question,
      options,
      multiple,
      topic,
      expiresAt,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't create the poll — try again" },
      { status: 500 },
    );
  }

  if (message && isNotifCategory(topic)) {
    void claimNotifySlot(`chat_notify_last_${topic}`, 900)
      .then((claimed) =>
        claimed
          ? notifyCategory(topic, {
              title:
                topic === "chat"
                  ? "Group Chat is active"
                  : "New activity in the community",
              body: `${me.name}: 📊 ${question.slice(0, 110)}`,
              url: "/community",
            })
          : undefined,
      )
      .catch(() => undefined);
  }

  return NextResponse.json({ ok: true, message });
}
