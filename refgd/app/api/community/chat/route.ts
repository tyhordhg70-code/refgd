import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { getCommunityBotUsername } from "@/lib/community-bot";
import {
  listChatMessages,
  createChatMessage,
  saveChatMedia,
  upsertChatMember,
  countChatMembers,
  getChatMemberModState,
  secondsSinceLastMessage,
  getModConfig,
  matchBlocklist,
  recordAction,
  sweepExpiredMessages,
  claimNotifySlot,
  isChatTopic,
  type ChatTopic,
} from "@/lib/community";
import { notifyCategory } from "@/lib/community-notify";
import { parseCommand, executeModCommand } from "@/lib/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 2000;
/** Minimum gap (seconds) between one member's messages — basic flood guard. */
const MIN_POST_GAP_S = 2;
/** Hard cap on an uploaded chat photo (client downscales to ≤1600px JPEG). */
const MAX_MEDIA_BYTES = 3 * 1024 * 1024;

/**
 * Sniff the actual image type from magic bytes — never trust the client's
 * declared Content-Type for stored/served media.
 */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png";
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  if (
    buf.subarray(0, 6).toString("ascii") === "GIF87a" ||
    buf.subarray(0, 6).toString("ascii") === "GIF89a"
  )
    return "image/gif";
  return null;
}

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
  const topicRaw = url.searchParams.get("topic");
  const topic: ChatTopic = isChatTopic(topicRaw) ? topicRaw : "chat";

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
  // Opportunistic auto-delete sweep on the full load only (idempotent, no
  // cron needed on Render). Expired group-chat messages (and anything already
  // soft-deleted by moderation) are hard-deleted from the database here so
  // nothing lingers; listChatMessages already hides them from the live feed.
  if (!after) {
    await sweepExpiredMessages().catch(() => undefined);
  }

  const [messages, memberCount, hideMembers, botUsername, welcome] =
    await Promise.all([
      listChatMessages({ afterId: after, viewerTid: me?.tid ?? null, topic }),
      countChatMembers(),
      getModConfig<boolean>("chat_hide_members", false),
      getCommunityBotUsername(),
      getModConfig<string>("welcome", ""),
    ]);

  const showCount = !hideMembers || Boolean(me?.admin);

  return NextResponse.json({
    me,
    messages,
    memberCount: showCount ? memberCount : null,
    hideMembers,
    botUsername,
    welcome,
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

  // Two content types share this endpoint: JSON (text-only, the common
  // path) and multipart/form-data (photo upload with an optional caption —
  // image + caption land in ONE bubble, Web A style).
  let payload: {
    text?: unknown;
    replyTo?: unknown;
    ttlSeconds?: unknown;
    topic?: unknown;
  };
  let photo: { bytes: Buffer; mime: string } | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid upload" },
        { status: 400 },
      );
    }
    payload = {
      text: form.get("text"),
      replyTo: form.get("replyTo"),
      ttlSeconds: form.get("ttlSeconds"),
      topic: form.get("topic"),
    };
    const file = form.get("photo");
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "No image attached" },
        { status: 400 },
      );
    }
    if (file.size > MAX_MEDIA_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Image is too large (max 3 MB)" },
        { status: 413 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = sniffImageMime(bytes);
    if (!mime) {
      return NextResponse.json(
        { ok: false, error: "Unsupported image type" },
        { status: 415 },
      );
    }
    photo = { bytes, mime };
  } else {
    try {
      payload = (await req.json()) as {
        text?: unknown;
        replyTo?: unknown;
        ttlSeconds?: unknown;
        topic?: unknown;
      };
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }
  }

  const topic: ChatTopic = isChatTopic(payload.topic) ? payload.topic : "chat";

  let text = typeof payload.text === "string" ? payload.text.trim() : "";
  // Only admins may create "Forwarded from …" banners. A regular member could
  // otherwise type a literal [fwd:NAME] token in the composer and spoof an
  // authentic forward header (impersonating admins/members), so strip any
  // leading forward token(s) from non-admin posts before storing.
  if (!me.admin) {
    text = text.replace(/^(?:\[fwd:[^\]\n]{1,64}\]\n?)+/, "").trim();
  }
  // A photo may go out caption-less; a plain message still needs text.
  if (!text && !photo) {
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

  const replyTo =
    (typeof payload.replyTo === "string" || typeof payload.replyTo === "number") &&
    /^\d+$/.test(String(payload.replyTo))
      ? String(payload.replyTo)
      : null;

  // Auto-delete TTL — GROUP CHAT ONLY. Only the live group chat rolls off; every
  // other section (announcements, testimonials, buy4u) keeps its posts forever
  // (owner request). Inside the group chat, messages expire after 7 days by
  // default; admins override per message via the composer: 0 = "Never" (keep
  // forever → NULL); any positive value sets a custom lifetime (capped at 30
  // days). Non-admins always get the 7-day default. Pinning later clears the TTL
  // (see setMessagePinned). When a message does expire it is hard-deleted from
  // the database by sweepExpiredMessages, not just hidden.
  const DEFAULT_TTL_S = 604_800; // 7 days
  let expiresAt: Date | null = null;
  if (topic === "chat") {
    let ttlSeconds = DEFAULT_TTL_S;
    if (me.admin) {
      const raw =
        typeof payload.ttlSeconds === "number"
          ? payload.ttlSeconds
          : typeof payload.ttlSeconds === "string" && /^\d+$/.test(payload.ttlSeconds)
            ? Number(payload.ttlSeconds)
            : DEFAULT_TTL_S;
      ttlSeconds = Math.min(Math.max(Math.floor(raw), 0), 2_592_000);
    }
    expiresAt = ttlSeconds > 0 ? new Date(Date.now() + ttlSeconds * 1000) : null;
  }

  const mod = await getChatMemberModState(me.tid);
  if (mod.isBanned) {
    return NextResponse.json(
      { ok: false, error: "You are banned from the chat" },
      { status: 403 },
    );
  }

  // Slash-commands are intercepted BEFORE the mute/flood/blocklist gates so an
  // admin can always moderate, and any member can read the rules. A command
  // never becomes a chat message — it returns ephemeral `system` feedback.
  // A caption on a photo is never a command — only bare text can be one.
  const command = photo ? null : parseCommand(text);
  if (command) {
    const result = await executeModCommand({
      me,
      cmd: command.cmd,
      rest: command.rest,
      replyToId: replyTo,
    });
    return NextResponse.json({ ok: result.ok !== false, system: result.system ?? "" });
  }

  if (mod.mutedUntil && new Date(mod.mutedUntil).getTime() > Date.now()) {
    return NextResponse.json(
      { ok: false, error: "You are muted" },
      { status: 403 },
    );
  }

  // Word blocklist applies to non-admins only.
  if (!me.admin && text) {
    const hit = await matchBlocklist(text);
    if (hit) {
      await recordAction({
        actorTgId: me.tid,
        actorName: me.name,
        action: "blocked-message",
        target: me.tid,
        meta: { word: hit },
      }).catch(() => undefined);
      return NextResponse.json(
        { ok: false, error: "Your message contains a blocked word." },
        { status: 403 },
      );
    }
  }

  // Flood gap is admin-configurable via /antiflood (0 = off); MIN_POST_GAP_S
  // is only the default when nothing has been set.
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

  // Persist the photo only after every moderation gate has passed, so a
  // rejected message never leaves an orphaned blob behind.
  let mediaId: string | null = null;
  if (photo) {
    try {
      mediaId = await saveChatMedia(photo.bytes, photo.mime);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't save the image — try again" },
        { status: 500 },
      );
    }
  }

  const message = await createChatMessage({
    tgId: me.tid,
    authorName: me.name,
    body: text,
    replyTo,
    expiresAt,
    topic,
    mediaId,
  });

  // Throttled chat notification: at most one fan-out per window across all
  // workers (atomic claim on mod_config), fail-soft so it can never break the
  // send. Subscribers opted into "chat" get "there's activity", not a ping
  // per message.
  if (message) {
    void claimNotifySlot(`chat_notify_last_${topic}`, 900)
      .then((claimed) =>
        claimed
          ? notifyCategory(topic, {
              title:
                topic === "chat"
                  ? "Group Chat is active"
                  : "New activity in the community",
              body: `${me.name}: ${text ? text.slice(0, 120) : "📷 Photo"}`,
              url: "/community",
            })
          : undefined,
      )
      .catch(() => undefined);
  }

  return NextResponse.json({ ok: true, message });
}
