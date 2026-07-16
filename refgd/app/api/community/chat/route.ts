import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  getCommunityBotUsername,
  sendCommunityTelegram,
} from "@/lib/community-bot";
import {
  listChatMessages,
  createChatMessage,
  discoverMessageEmoji,
  saveChatMedia,
  upsertChatMember,
  countChatMembers,
  getChatMemberModState,
  secondsSinceLastMessage,
  getModConfig,
  matchBlocklist,
  matchFilter,
  ensureBotMember,
  BOT_MEMBER_TG_ID,
  BOT_MEMBER_NAME,
  recordAction,
  sweepExpiredMessages,
  claimNotifySlot,
  isChatTopic,
  isNotifCategory,
  listTyping,
  clearTyping,
  rewriteMentions,
  mentionedTgIds,
  mentionPreview,
  hashDeviceSignal,
  ipFromRequest,
  checkDeviceBan,
  setMemberBan,
  type ChatTopic,
} from "@/lib/community";
import { notifyCategory, notifyAll } from "@/lib/community-notify";
import {
  buildMiniAppLink,
  buildStartParam,
} from "@/components/community/tg/deeplink";
import { parseCommand, executeModCommand } from "@/lib/moderation";
import { memoTtl } from "@/lib/micro-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 2000;

/**
 * Commands whose successful confirmation is announced publicly in-chat as a
 * Rose bot message (owner ask: "all action commands should be from Rose bot").
 * Informational/list commands (help, filters, rules, blacklist) stay ephemeral.
 * Includes the hidden aliases (setflood, welcome, blocklist → mutating ones).
 */
const ROSE_ANNOUNCE_CMDS = new Set([
  "ban",
  "unban",
  "mute",
  "unmute",
  "warn",
  "unwarn",
  "kick",
  "filter",
  "stop",
  "addblacklist",
  "rmblacklist",
  "antiflood",
  "setflood",
  "pin",
  "unpin",
  // "del"/"purge" intentionally NOT announced: Telegram never posts a chat
  // message for deletions — the client shows a fading center toast instead.
  "setwelcome",
  "welcome",
  "setrules",
]);
/** Minimum gap (seconds) between one member's messages — basic flood guard. */
const MIN_POST_GAP_S = 2;
/** Hard cap on an uploaded chat photo (client downscales to ≤1600px JPEG). */
const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
/**
 * Hard cap on an uploaded video clip. Kept deliberately modest: formData()
 * buffers the whole body in memory AND node-postgres hex-encodes BYTEA
 * params (~2x transient memory on INSERT) — Render's instance is tight.
 */
const MAX_VIDEO_BYTES = 16 * 1024 * 1024;
/** Hard cap on an uploaded document (kind='file'). */
const MAX_FILE_BYTES = 8 * 1024 * 1024;
/** Hard cap on the client-captured video poster frame (JPEG). */
const MAX_POSTER_BYTES = 512 * 1024;
/**
 * Reject oversized multipart bodies from the Content-Length header BEFORE
 * req.formData() buffers them — the per-field caps alone can't stop the
 * memory spike, the buffering has already happened by then.
 */
const MAX_UPLOAD_BODY_BYTES = MAX_VIDEO_BYTES + MAX_POSTER_BYTES + 256 * 1024;

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
 * Sniff a recorded voice note's real container from magic bytes. Recorders
 * produce audio/mp4 (AAC — Safari + modern Chrome), webm/opus (older Chrome/
 * Firefox) or ogg/opus; mp3 accepted for completeness.
 */
function sniffAudioMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  )
    return "audio/webm";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") return "audio/mp4";
  if (buf.subarray(0, 4).toString("ascii") === "OggS") return "audio/ogg";
  if (buf.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  if (buf[0] === 0xff && ((buf[1] ?? 0) & 0xe0) === 0xe0) return "audio/mpeg";
  return null;
}

/**
 * Sniff an uploaded video's real container from magic bytes. Phones and
 * screen recorders produce mp4/quicktime (iOS) or webm (Android/desktop
 * capture). Deliberately separate from sniffAudioMime — that one claims any
 * `ftyp` as audio/mp4 and EBML as audio/webm.
 */
function sniffVideoMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    return brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
  }
  if (
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  )
    return "video/webm";
  if (buf.subarray(0, 4).toString("ascii") === "OggS") return "video/ogg";
  return null;
}

/** Max recorded voice-note length accepted by the server (seconds). */
const MAX_VOICE_S = 600;

/**
 * GET  → chat state: recent messages (or only those after `?after=<id>` when
 *        short-polling), the current member (if signed in), the live member
 *        count (unless the admin has hidden it) and the community bot username
 *        (needed to render the Telegram Login Widget).
 *
 * Reading the chat is public — it is the "window into the group". Loading it
 * while signed in also refreshes the member's presence (a lightweight join).
 */
/** Build the chat-state payload for one GET. `me` is null when anonymous. */
async function buildChatState(
  topic: ChatTopic,
  me: Awaited<ReturnType<typeof readMemberSession>>,
  after: string | null,
) {
  // typing[] rides on BOTH the short-poll and the full load — the 2.5s
  // ?after= tick is the delivery path that makes the indicator feel live.
  //
  // The single-row scalars (member count, group settings) used to run on
  // EVERY 2.5s poll of every open tab — memoized a few seconds each since
  // the July 2026 Neon data-transfer-quota incident. An admin toggling
  // hide-members / editing the welcome converges within seconds.
  const [messages, memberCount, hideMembers, botUsername, welcome, typing] =
    await Promise.all([
      listChatMessages({ afterId: after, viewerTid: me?.tid ?? null, topic }),
      memoTtl("community:memberCount", 15_000, countChatMembers),
      memoTtl("community:cfg:hideMembers", 10_000, () =>
        getModConfig<boolean>("chat_hide_members", false),
      ),
      getCommunityBotUsername(), // already memoized in-process (getMe)
      memoTtl("community:cfg:welcome", 10_000, () =>
        getModConfig<string>("welcome", ""),
      ),
      listTyping(topic, me?.tid ?? null).catch(() => [] as string[]),
    ]);

  const showCount = !hideMembers || Boolean(me?.admin);

  // Ban gate (defense-in-depth): a banned non-admin member must see nothing.
  // Only checked on the FULL load (after === null) to avoid a per-poll DB read
  // — the shell blocks banned users up front, so a poll never runs for them.
  let banned = false;
  let banReason: string | null = null;
  if (me && !me.admin && after === null) {
    try {
      const mod = await getChatMemberModState(me.tid);
      banned = mod.isBanned;
      banReason = mod.isBanned ? mod.banReason : null;
    } catch {
      banned = false;
    }
  }

  return {
    me,
    messages: banned ? [] : messages,
    memberCount: showCount ? memberCount : null,
    hideMembers,
    botUsername,
    welcome,
    typing,
    banned,
    banReason,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // ?meta=1 — lightweight topic-LIST refresher (member count + group-chat
  // last-message preview). The list page is server-rendered once and the
  // Mini App then lives for minutes/hours, so without this the "N members"
  // label and chat preview stay frozen at whatever they were on load.
  // Session-free and served from one shared memo (bounded key space, no
  // per-viewer reads) — same Neon-quota posture as the anon snapshot below.
  if (url.searchParams.get("meta") === "1") {
    const payload = await memoTtl("community:listMeta", 5_000, async () => {
      const [memberCount, hideMembers, lastMessages] = await Promise.all([
        countChatMembers(),
        getModConfig<boolean>("chat_hide_members", false),
        listChatMessages({ limit: 1 }),
      ]);
      const last = lastMessages[lastMessages.length - 1];
      return {
        memberCount: hideMembers ? null : memberCount,
        lastMessage: last
          ? {
              authorName: last.authorName,
              body: last.body,
              createdAt: last.createdAt,
            }
          : null,
      };
    });
    return NextResponse.json(payload);
  }

  const after = url.searchParams.get("after");
  const topicRaw = url.searchParams.get("topic");
  const topic: ChatTopic = isChatTopic(topicRaw) ? topicRaw : "chat";

  const me = await readMemberSession();

  // Anonymous readers are all served from ONE shared 3s snapshot per topic
  // (July 2026 Neon quota incident): every logged-out visitor previously
  // re-read the whole 60-message window from the DB on full load AND hit
  // listChatMessages/listTyping on every 2.5s short-poll. Signed-in readers
  // below always get a fresh, viewer-specific read.
  if (!me) {
    const payload = await memoTtl(
      `community:anonFull:${topic}`,
      3_000,
      async () => {
        // Opportunistic auto-delete sweep rides the (now rate-limited)
        // anonymous snapshot refresh too (idempotent, no cron on Render).
        await sweepExpiredMessages().catch(() => undefined);
        return buildChatState(topic, null, null);
      },
    );
    if (!after) return NextResponse.json(payload);
    // Short-poll: derive "messages newer than `after`" from the SAME
    // snapshot — zero extra DB reads and a BOUNDED cache key space (one
    // entry per topic; never key a public cache by a client-supplied
    // value). Ids are numeric-ASC; an invalid `after` falls back to the
    // full window, matching listChatMessages' own afterId validation. A
    // very stale anon tab gets the latest-60 window instead of the next-60
    // after its id — acceptable: the 30s full refresh reconciles to the
    // same window anyway. Worst-case freshness for anon viewers is ~3s
    // (snapshot TTL) + the 2.5s poll tick.
    const afterNum = /^\d+$/.test(after) ? Number(after) : Number.NaN;
    const newer = Number.isFinite(afterNum)
      ? payload.messages.filter((m) => Number(m.id) > afterNum)
      : payload.messages;
    return NextResponse.json({ ...payload, messages: newer });
  }

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

  return NextResponse.json(await buildChatState(topic, me, after));
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
  let photo: {
    bytes: Buffer;
    mime: string;
    w: number | null;
    h: number | null;
  } | null = null;
  // Uploaded video clip (multipart `video` field) with its optional
  // client-captured poster frame — both land in chat_media, the poster as a
  // separate row referenced via poster_id.
  let video: {
    bytes: Buffer;
    mime: string;
    w: number | null;
    h: number | null;
    duration: number | null;
    poster: { bytes: Buffer; mime: string } | null;
  } | null = null;
  // Uploaded document (multipart `file` field) — any bytes, always served
  // with Content-Disposition: attachment (never inline).
  let docFile: {
    bytes: Buffer;
    name: string;
  } | null = null;
  // Recorded voice note (multipart `voice` field). The [voice:…] body token
  // is composed SERVER-side after all gates pass — the client never sends it,
  // so the blocklist can't randomly trip on waveform characters.
  let voice: {
    bytes: Buffer;
    mime: string;
    duration: number;
    waveform: string;
  } | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    // Reject oversized bodies BEFORE formData() buffers them in memory.
    const bodyLen = Number(req.headers.get("content-length"));
    if (Number.isFinite(bodyLen) && bodyLen > MAX_UPLOAD_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Upload is too large" },
        { status: 413 },
      );
    }
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
    const voiceFile = form.get("voice");
    const file = form.get("photo");
    const videoFile = form.get("video");
    const docUpload = form.get("file");
    if (voiceFile instanceof Blob) {
      if (voiceFile.size > MAX_MEDIA_BYTES) {
        return NextResponse.json(
          { ok: false, error: "Voice message is too large (max 3 MB)" },
          { status: 413 },
        );
      }
      const bytes = Buffer.from(await voiceFile.arrayBuffer());
      const mime = sniffAudioMime(bytes);
      if (!mime) {
        return NextResponse.json(
          { ok: false, error: "Unsupported audio type" },
          { status: 415 },
        );
      }
      const durRaw = form.get("duration");
      const duration = Math.min(
        Math.max(
          Math.round(
            typeof durRaw === "string" && /^\d+$/.test(durRaw)
              ? Number(durRaw)
              : 1,
          ),
          1,
        ),
        MAX_VOICE_S,
      );
      const wfRaw = form.get("waveform");
      const waveform =
        typeof wfRaw === "string" && /^[0-9a-v]{1,64}$/.test(wfRaw)
          ? wfRaw
          : "";
      voice = { bytes, mime, duration, waveform };
    } else if (file instanceof Blob) {
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
      // Intrinsic pixel size measured client-side during the downscale —
      // stored with the blob so bubbles can reserve layout space before the
      // image loads (no text-then-image pop-in). Bounds-checked, fail-soft.
      const wRaw = Number(form.get("mediaW"));
      const hRaw = Number(form.get("mediaH"));
      const dimsOk =
        Number.isInteger(wRaw) &&
        Number.isInteger(hRaw) &&
        wRaw > 0 &&
        hRaw > 0 &&
        wRaw <= 10000 &&
        hRaw <= 10000;
      photo = {
        bytes,
        mime,
        w: dimsOk ? wRaw : null,
        h: dimsOk ? hRaw : null,
      };
    } else if (videoFile instanceof Blob) {
      if (videoFile.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { ok: false, error: "Video is too large (max 16 MB)" },
          { status: 413 },
        );
      }
      const bytes = Buffer.from(await videoFile.arrayBuffer());
      const mime = sniffVideoMime(bytes);
      if (!mime) {
        return NextResponse.json(
          { ok: false, error: "Unsupported video type" },
          { status: 415 },
        );
      }
      // Client-captured poster frame (JPEG) — optional; browsers can't decode
      // every container (e.g. HEVC .mov), those clips just render posterless.
      let poster: { bytes: Buffer; mime: string } | null = null;
      const posterBlob = form.get("poster");
      if (posterBlob instanceof Blob && posterBlob.size <= MAX_POSTER_BYTES) {
        const pBytes = Buffer.from(await posterBlob.arrayBuffer());
        const pMime = sniffImageMime(pBytes);
        if (pMime) poster = { bytes: pBytes, mime: pMime };
      }
      const wRaw = Number(form.get("mediaW"));
      const hRaw = Number(form.get("mediaH"));
      const dimsOk =
        Number.isInteger(wRaw) &&
        Number.isInteger(hRaw) &&
        wRaw > 0 &&
        hRaw > 0 &&
        wRaw <= 10000 &&
        hRaw <= 10000;
      const durRaw = Number(form.get("duration"));
      const duration =
        Number.isFinite(durRaw) && durRaw > 0 && durRaw <= 6 * 3600
          ? durRaw
          : null;
      video = {
        bytes,
        mime,
        w: dimsOk ? wRaw : null,
        h: dimsOk ? hRaw : null,
        duration,
        poster,
      };
    } else if (docUpload instanceof Blob) {
      if (docUpload.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { ok: false, error: "File is too large (max 8 MB)" },
          { status: 413 },
        );
      }
      if (docUpload.size === 0) {
        return NextResponse.json(
          { ok: false, error: "File is empty" },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await docUpload.arrayBuffer());
      // Filename: strip control chars + path separators, cap the length. The
      // serving route re-sanitizes for the Content-Disposition header.
      const nameRaw = form.get("fileName");
      const name =
        (typeof nameRaw === "string" ? nameRaw : "")
          // eslint-disable-next-line no-control-regex
          .replace(/[\x00-\x1f\x7f/\\]/g, "")
          .trim()
          .slice(0, 128) || "file";
      docFile = { bytes, name };
    } else {
      return NextResponse.json(
        { ok: false, error: "No file attached" },
        { status: 400 },
      );
    }
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

  // Every topic EXCEPT the group chat is admin-authored (owner ask): everyone
  // can read them (GET), but only admins may post. isChatTopic() alone would
  // let any member write here, and the client hiding the composer is not an
  // access control — gate it on the server.
  if (topic !== "chat" && !me.admin) {
    return NextResponse.json(
      { ok: false, error: "This topic is read-only." },
      { status: 403 },
    );
  }

  let text = typeof payload.text === "string" ? payload.text.trim() : "";
  // Only admins may create "Forwarded from …" banners. A regular member could
  // otherwise type a literal [fwd:NAME] token in the composer and spoof an
  // authentic forward header (impersonating admins/members), so strip any
  // leading forward token(s) from non-admin posts before storing.
  if (!me.admin) {
    text = text.replace(/^(?:\[fwd:[^\]\n]{1,64}\]\n?)+/, "").trim();
  }
  // [voice:…] and [poll:…] body tokens are reserved for the server — voice
  // notes compose theirs below and polls are created via the poll route. A
  // member typing one literally would render a broken voice/poll bubble, so
  // strip them from every typed message.
  text = text.replace(/\[(?:voice|poll):[^\]\n]*\]/g, "").trim();
  // Voice notes are caption-less (Web A parity) — the token IS the body.
  if (voice) text = "";
  // Media may go out caption-less; a plain message still needs text.
  if (!text && !photo && !voice && !video && !docFile) {
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

  // IP + device-fingerprint ban (owner ask): a member whose current IP or any
  // recorded device signal matches a banned device is blocked even though
  // this tg_id was never itself banned (fresh account, VPN, …). Device match
  // → "previously banned" (owner-specified wording); IP-only match → the same
  // generic message as a normal ban so the IP ban is never disclosed. The
  // account is auto-flagged so the block sticks. Exact-hash matching only, and
  // admins are exempt (false-positive guard). Fail-soft on lookup errors.
  if (!me.admin) {
    try {
      const ip = ipFromRequest(req);
      const hit = await checkDeviceBan(me.tid, {
        ip: ip ? hashDeviceSignal("ip", ip) : null,
      });
      if (hit !== "none") {
        await setMemberBan(me.tid, true).catch(() => undefined);
        return NextResponse.json(
          {
            ok: false,
            error:
              hit === "device"
                ? "You have been previously banned."
                : "You are banned from the chat",
          },
          { status: 403 },
        );
      }
    } catch {
      // never let the device-ban check break a legitimate send
    }
  }

  // Slash-commands are intercepted BEFORE the mute/flood/blocklist gates so an
  // admin can always moderate, and any member can read the rules. A command
  // never becomes a chat message — it returns ephemeral `system` feedback.
  // A caption on a photo is never a command — only bare text can be one.
  const command = photo || voice || video || docFile ? null : parseCommand(text);
  if (command) {
    const result = await executeModCommand({
      me,
      cmd: command.cmd,
      rest: command.rest,
      replyToId: replyTo,
    });
    // Rose persona (owner ask): successful ACTION commands announce their
    // confirmation publicly as a Rose message (bot tag + authentic avatar),
    // exactly like @MissRose_bot in a real group — replying to the targeted
    // message where one exists. Informational commands (/help, /filters,
    // /rules, list views) and every error stay ephemeral to the actor.
    // Fail-soft: the announcement must never break the command result.
    if (
      result.handled &&
      result.ok !== false &&
      result.system &&
      ROSE_ANNOUNCE_CMDS.has(command.cmd)
    ) {
      try {
        await ensureBotMember();
        // /del + /purge destroy the replied-to message — a reply ref to a
        // deleted row would render an empty preview, so drop it there.
        const keepReply =
          replyTo && command.cmd !== "del" && command.cmd !== "purge";
        await createChatMessage({
          tgId: BOT_MEMBER_TG_ID,
          authorName: BOT_MEMBER_NAME,
          body: result.system,
          replyTo: keepReply ? replyTo : null,
          expiresAt,
          topic,
        });
      } catch {
        // announcement is best-effort only
      }
    }
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

  // Persist the media blob only after every moderation gate has passed,
  // so a rejected message never leaves an orphaned blob behind.
  let mediaId: string | null = null;
  if (photo) {
    try {
      mediaId = await saveChatMedia(photo.bytes, photo.mime, photo.w, photo.h);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't save the image — try again" },
        { status: 500 },
      );
    }
  }
  if (video) {
    try {
      // Poster first so the clip row can reference it via poster_id.
      let posterId: string | null = null;
      if (video.poster) {
        posterId = await saveChatMedia(
          video.poster.bytes,
          video.poster.mime,
          video.w,
          video.h,
        );
      }
      mediaId = await saveChatMedia(video.bytes, video.mime, video.w, video.h, {
        kind: "video",
        duration: video.duration,
        posterId,
      });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't save the video — try again" },
        { status: 500 },
      );
    }
  }
  if (docFile) {
    try {
      mediaId = await saveChatMedia(
        docFile.bytes,
        "application/octet-stream",
        null,
        null,
        { kind: "file", name: docFile.name },
      );
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't save the file — try again" },
        { status: 500 },
      );
    }
  }
  // Voice notes: store the audio in chat_media, then compose the body token
  // here (server-side). mediaId stays NULL on the message row so the photo
  // renderer never tries to <img> an audio blob.
  if (voice) {
    let voiceMediaId: string;
    try {
      voiceMediaId = await saveChatMedia(voice.bytes, voice.mime);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Couldn't save the voice message — try again" },
        { status: 500 },
      );
    }
    text = `[voice:${voiceMediaId}:${voice.duration}:${voice.waveform}]`;
  }

  // @Display-Name mentions: rewrite plain `@Name` text into server-composed
  // [m:<tgId>:<name>] tokens (and fold any client-smuggled tokens back to
  // text first — they are server-only, like [voice:]/[poll:]). Voice bodies
  // are pure tokens and never carry mentions.
  if (!voice && text) {
    text = await rewriteMentions(text);
  }

  // Pasted foreign-pack custom emoji: validate + cache their artwork BEFORE
  // the message lands so its bubble can animate on first render (the emoji
  // serve route is cache-first — see discoverMessageEmoji).
  await discoverMessageEmoji(text);

  const message = await createChatMessage({
    tgId: me.tid,
    authorName: me.name,
    body: text,
    replyTo,
    expiresAt,
    topic,
    mediaId,
  });

  // A send always ends the sender's "typing…" state immediately (fail-soft).
  void clearTyping(topic, me.tid).catch(() => undefined);

  // Rose-style auto-reply filters (/filter <trigger> <reply>) — live group
  // chat only, plain-text messages only (a photo caption or voice note never
  // triggers). The bot's reply is an ordinary message row authored by the
  // reserved bot member, replying to the triggering message, with the same
  // TTL policy as any other group-chat message. Fail-soft: a filter error
  // must never break the send.
  let extraMessages: NonNullable<typeof message>[] = [];
  if (message && topic === "chat" && text && !photo && !voice && !video && !docFile) {
    try {
      const hit = await matchFilter(text);
      if (hit) {
        await ensureBotMember();
        const botReply = await createChatMessage({
          tgId: BOT_MEMBER_TG_ID,
          authorName: BOT_MEMBER_NAME,
          body: hit.response,
          replyTo: message.id,
          expiresAt,
          topic,
        });
        if (botReply) extraMessages = [botReply];
      }
    } catch {
      // never let the auto-reply break the member's own send
    }
  }

  // Mention pings — fire-and-forget, never blocking or failing the send.
  // Each mentioned member gets a bot DM naming who mentioned them; an
  // admin's @everyone broadcasts to the whole community (web push + DMs),
  // exactly like a pin. A non-admin's "@everyone" stays plain text.
  if (message && text) {
    const targets = mentionedTgIds(text).filter(
      (id) => id !== me.tid && id !== BOT_MEMBER_TG_ID,
    );
    const snippet = mentionPreview(text);
    if (targets.length > 0) {
      void (async () => {
        const esc = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // "Open Chat" must re-open the Mini App at the mentioning message —
        // a plain website URL bounced members to the signed-out browser view
        // instead. Same t.me/<bot>?startapp=… contract as Copy Link/Forward;
        // the website URL survives only as a fallback if the bot username
        // cannot be resolved (misconfigured token).
        const bot = await getCommunityBotUsername().catch(() => null);
        const url = bot
          ? buildMiniAppLink(bot, buildStartParam(topic, message.id))
          : "https://refundgod.io/community#chat";
        for (const id of targets) {
          await sendCommunityTelegram(
            id,
            `<b>${esc(me.name)}</b> mentioned you in RefundGod Law Firm:\n${esc(snippet)}`,
            { text: "Open Chat", url },
          ).catch(() => undefined);
        }
      })();
    }
    if (me.admin && /(^|\s)@everyone\b/i.test(text)) {
      void notifyAll({
        title: `${me.name} mentioned everyone`,
        body: snippet || "New message in the Group Chat",
        url: "/community#chat",
      }).catch(() => undefined);
    }
  }

  // Throttled chat notification: at most one fan-out per window across all
  // workers (atomic claim on mod_config), fail-soft so it can never break the
  // send. Subscribers opted into "chat" get "there's activity", not a ping
  // per message.
  if (message && isNotifCategory(topic)) {
    void claimNotifySlot(`chat_notify_last_${topic}`, 900)
      .then((claimed) =>
        claimed
          ? notifyCategory(topic, {
              title:
                topic === "chat"
                  ? "Group Chat is active"
                  : "New activity in the community",
              body: `${me.name}: ${
                voice
                  ? "🎤 Voice message"
                  : text
                    ? text.slice(0, 120)
                    : video
                      ? "🎬 Video"
                      : docFile
                        ? "📎 File"
                        : "📷 Photo"
              }`,
              url: "/community",
            })
          : undefined,
      )
      .catch(() => undefined);
  }

  return NextResponse.json({ ok: true, message, extra: extraMessages });
}
