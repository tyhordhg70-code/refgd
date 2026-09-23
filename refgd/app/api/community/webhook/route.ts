import { NextResponse } from "next/server";
import {
  isCommunityAdmin,
  sendCommunityTelegram,
  sendCommunityKeyboard,
  answerCallbackQuery,
  editCommunityMessage,
  downloadTelegramFile,
  sha256Hex,
  communityMiniAppUrl,
  TELEGRAM_MAX_DOWNLOAD,
} from "@/lib/community-bot";
import {
  createVouch,
  addVouchMedia,
  countVouches,
  recordAction,
  recordCommunityBotUser,
  enqueuePendingForward,
  claimForwardPrompt,
  claimForwardPromptRefresh,
  setForwardPromptMsg,
  claimPendingForwards,
  purgeStalePendingForwards,
  learnEmojiPacksFromIds,
  createChatMessage,
  saveChatMedia,
  ensureChatMemberStub,
  type PendingForwardRow,
  type VouchSection,
} from "@/lib/community";
import { notifyCategory } from "@/lib/community-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canonical public origin for Mini App launch URLs. Deliberately NOT
 * publicBaseUrl(): that falls back to RENDER_EXTERNAL_URL (the onrender.com
 * host), which would open the Mini App on a different domain than the menu
 * button and split member sessions across domains.
 */
function communityBase(): string {
  return (process.env.PUBLIC_BASE_URL || "https://refundgod.io").replace(
    /\/$/,
    "",
  );
}

/**
 * POST /api/community/webhook
 *
 * The community ingestion bot. An admin (COMMUNITY_ADMIN_TG_IDS) DMs/forwards
 * to the bot; forwards are QUEUED and the bot asks once per batch where to
 * post them (Client Testimonials / BUY4U Vouches / Announcements) via an
 * inline keyboard — tap a destination and the whole batch posts there,
 * preserving each original author's name and photo. All content is stored
 * permanently in Postgres — the bot holds no state. Non-admins get a friendly
 * pointer to the group. The webhook is protected by COMMUNITY_WEBHOOK_SECRET.
 */

type TgPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};
type TgForwardOrigin =
  | {
      type: "user";
      date?: number;
      sender_user: { first_name?: string; last_name?: string };
    }
  | { type: "hidden_user"; date?: number; sender_user_name: string }
  | { type: "chat"; date?: number; sender_chat: { title?: string } }
  | { type: "channel"; date?: number; chat: { title?: string } };
type TgEntity = {
  type: string;
  offset: number;
  length: number;
  custom_emoji_id?: string;
  url?: string;
};
/**
 * Every non-photo attachment Telegram can put on a message. The fields are a
 * union of the Video/Animation/VideoNote/Voice/Audio/Document/Sticker objects
 * — each type only fills the ones that apply to it.
 */
type TgFile = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  mime_type?: string;
  file_name?: string;
  /** Seconds (video, animation, video_note, voice, audio). */
  duration?: number;
  width?: number;
  height?: number;
  /** video_note is square: side length in px. */
  length?: number;
  title?: string;
  performer?: string;
  is_animated?: boolean;
  is_video?: boolean;
  thumbnail?: TgPhotoSize;
  /** Bot API < 7.0 spelling, still sent by some clients. */
  thumb?: TgPhotoSize;
};
type TgMessage = {
  message_id: number;
  date?: number;
  text?: string;
  caption?: string;
  media_group_id?: string;
  chat?: { id?: number | string };
  from?: { id?: number | string; first_name?: string; last_name?: string };
  photo?: TgPhotoSize[];
  video?: TgFile;
  animation?: TgFile;
  video_note?: TgFile;
  voice?: TgFile;
  audio?: TgFile;
  document?: TgFile;
  sticker?: TgFile;
  entities?: TgEntity[];
  caption_entities?: TgEntity[];
  forward_origin?: TgForwardOrigin;
  forward_from?: { first_name?: string; last_name?: string };
  forward_sender_name?: string;
};
/**
 * Splice body tokens into a message's text wherever an entity covers it:
 *   - custom_emoji → `[ce:<documentId>:<alt>]`. Without this the ingestion
 *     queue stored only bare unicode (msg.text drops entities), so an owner's
 *     premium animated emoji — the whole reason a message looks alive in
 *     Telegram — arrived on the site as static standard glyphs.
 *   - text_link → `[label](url)`. A real Telegram hyperlink (e.g. a Rose
 *     filter reply saved with markdown) carries its URL ONLY in the entity;
 *     msg.text has just the label, so without this the site permanently lost
 *     the link and rendered plain text.
 * Telegram entity offsets/lengths are UTF-16 code units, which is exactly
 * what JS string indices are, so a straight slice works; entities are applied
 * right-to-left so earlier offsets stay valid, with an overlap guard for
 * malformed payloads. A custom_emoji nested inside a text_link is dropped in
 * favor of the link (the label keeps its bare glyph, which still renders as
 * animated standard emoji) — losing a clickable URL is worse than losing a
 * premium sticker frame.
 */
function spliceEntityTokens(
  text: string,
  entities: TgEntity[] | undefined,
): string {
  if (!text || !entities?.length) return text;
  const spanOk = (e: TgEntity) =>
    Number.isInteger(e.offset) &&
    Number.isInteger(e.length) &&
    e.offset >= 0 &&
    e.length > 0 &&
    e.offset + e.length <= text.length;
  const links = entities.filter((e) => {
    if (e.type !== "text_link" || typeof e.url !== "string" || !spanOk(e))
      return false;
    if (!/^https?:\/\/\S+$/.test(e.url)) return false;
    const label = text.slice(e.offset, e.offset + e.length);
    // Token grammar: "]" terminates the label, whitespace/")" terminate the
    // URL on the render side ("(" and ")" get percent-encoded below).
    return label.trim().length > 0 && !label.includes("]");
  });
  const ce = entities.filter(
    (e) =>
      e.type === "custom_emoji" &&
      typeof e.custom_emoji_id === "string" &&
      /^\d{1,32}$/.test(e.custom_emoji_id) &&
      spanOk(e) &&
      // Nested inside a kept link → the link token wins.
      !links.some(
        (l) => e.offset >= l.offset && e.offset + e.length <= l.offset + l.length,
      ),
  );
  const all = [...links, ...ce].sort((a, b) => b.offset - a.offset);
  let out = text;
  let prevStart = Infinity;
  for (const e of all) {
    if (e.offset + e.length > prevStart) continue;
    const covered = text.slice(e.offset, e.offset + e.length);
    let token: string;
    if (e.type === "text_link") {
      const url = (e.url as string).replace(/\(/g, "%28").replace(/\)/g, "%29");
      token = `[${covered}](${url})`;
    } else {
      // The token grammar reserves "]" as the alt terminator; a covered run
      // containing one (never a real emoji) would produce an unparseable token.
      if (!covered || covered.includes("]")) continue;
      token = `[ce:${e.custom_emoji_id}:${covered}]`;
    }
    out = out.slice(0, e.offset) + token + out.slice(e.offset + e.length);
    prevStart = e.offset;
  }
  return out;
}

type TgCallbackQuery = {
  id: string;
  from?: { id?: number | string; first_name?: string; last_name?: string };
  message?: { message_id: number; chat?: { id?: number | string } };
  data?: string;
};
type TgUpdate = {
  update_id?: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

function fullName(f?: string, l?: string): string | null {
  const s = [f, l].filter(Boolean).join(" ").trim();
  return s || null;
}

function authorFromForward(m: TgMessage): string | null {
  const o = m.forward_origin;
  if (o) {
    if (o.type === "user") {
      return fullName(o.sender_user.first_name, o.sender_user.last_name);
    }
    if (o.type === "hidden_user") return o.sender_user_name || null;
    if (o.type === "channel") return o.chat?.title || null;
    if (o.type === "chat") return o.sender_chat?.title || null;
  }
  if (m.forward_from) {
    return fullName(m.forward_from.first_name, m.forward_from.last_name);
  }
  if (m.forward_sender_name) return m.forward_sender_name;
  return null;
}

/**
 * What the forwarded message is carrying, normalized to the four kinds the
 * site can store and render (see vouch_media.kind).
 *
 * Telegram is the ONLY place this information exists: getFile later returns a
 * path and nothing else, so mime, duration, filename and the thumbnail id all
 * have to be captured here, on the incoming update, and carried through the
 * queue to post time.
 *
 * Returns `null` when there is no attachment at all (plain text forward), or
 * a rejection when the attachment exists but cannot be ingested — the caller
 * TELLS the owner instead of silently dropping it, which is how a forwarded
 * video used to disappear without a trace.
 */
type Attachment = {
  kind: "photo" | "video" | "voice" | "file";
  fileId: string;
  fileUniqueId: string;
  mime: string | null;
  duration: number | null;
  fileName: string | null;
  thumbFileId: string | null;
  w: number | null;
  h: number | null;
};
type AttachmentPick =
  | { att: Attachment; reject: null }
  | { att: null; reject: string | null };

function thumbOf(f: TgFile): string | null {
  return f.thumbnail?.file_id ?? f.thumb?.file_id ?? null;
}

function pickAttachment(msg: TgMessage): AttachmentPick {
  const none: AttachmentPick = { att: null, reject: null };
  const photos = msg.photo ?? [];
  const build = (
    f: TgFile,
    kind: Attachment["kind"],
    extra?: Partial<Attachment>,
  ): AttachmentPick => {
    if ((f.file_size ?? 0) > TELEGRAM_MAX_DOWNLOAD) {
      return {
        att: null,
        reject: `⚠️ That file is ${Math.round((f.file_size ?? 0) / (1024 * 1024))} MB. Telegram only lets bots download files up to 20 MB, so I couldn't queue it — post it from the website instead (Group Chat composer → attach).`,
      };
    }
    return {
      att: {
        kind,
        fileId: f.file_id,
        fileUniqueId: f.file_unique_id,
        mime: f.mime_type ?? null,
        duration: typeof f.duration === "number" ? f.duration : null,
        fileName: f.file_name ?? null,
        thumbFileId: thumbOf(f),
        w: f.width ?? null,
        h: f.height ?? null,
        ...extra,
      },
      reject: null,
    };
  };

  if (photos.length > 0) {
    const largest = photos[photos.length - 1];
    if ((largest.file_size ?? 0) > TELEGRAM_MAX_DOWNLOAD) {
      return { att: null, reject: "⚠️ That photo is over 20 MB — Telegram won't let bots download it." };
    }
    return {
      att: {
        kind: "photo",
        fileId: largest.file_id,
        fileUniqueId: largest.file_unique_id,
        mime: null,
        duration: null,
        fileName: null,
        thumbFileId: null,
        w: largest.width ?? null,
        h: largest.height ?? null,
      },
      reject: null,
    };
  }
  if (msg.video) return build(msg.video, "video");
  // A GIF is an mp4 with no sound; a video note is a square clip. Both are
  // videos as far as storage and the bubble are concerned.
  if (msg.animation) return build(msg.animation, "video");
  if (msg.video_note) {
    const side = msg.video_note.length ?? null;
    return build(msg.video_note, "video", { w: side, h: side });
  }
  if (msg.voice) {
    return build(msg.voice, "voice", {
      mime: msg.voice.mime_type ?? "audio/ogg",
    });
  }
  if (msg.audio) {
    // A music/audio file is not a voice note — it keeps its filename and
    // downloads, like Telegram's own audio row.
    const a = msg.audio;
    const named =
      a.file_name ??
      [a.performer, a.title].filter(Boolean).join(" — ") ??
      null;
    return build(a, "file", { fileName: named || "audio" });
  }
  if (msg.document) {
    const d = msg.document;
    const mime = d.mime_type ?? "";
    // Telegram sends "uncompressed" photos and some clips as documents.
    // Route them to the tile that actually renders them; SVG stays a
    // download (an inline same-origin SVG is stored XSS).
    if (/^image\/(jpeg|png|webp|gif)$/i.test(mime)) return build(d, "photo");
    if (/^video\//i.test(mime)) return build(d, "video");
    return build(d, "file", { fileName: d.file_name ?? "file" });
  }
  if (msg.sticker) {
    const s = msg.sticker;
    if (s.is_animated || s.is_video) {
      return {
        att: null,
        reject:
          "⚠️ Animated stickers can't be posted to the site yet — forward a photo, video, voice note or file instead.",
      };
    }
    return build(s, "photo", { mime: "image/webp" });
  }
  return none;
}

function sectionLabel(s: VouchSection): string {
  return s === "buy4u"
    ? "BUY4U Vouches"
    : s === "announcements"
      ? "Announcements"
      : "Client Testimonials";
}

/**
 * Where a queued batch can land: one of the three vouch sections, or the live
 * Group Chat. Chat is a different storage shape entirely (chat_messages rows
 * authored by a real member, one attachment each, 7-day auto-delete) — see
 * postForwardToChat.
 */
type ForwardDest = VouchSection | "chat";

function destLabel(d: ForwardDest): string {
  return d === "chat" ? "Group Chat" : sectionLabel(d);
}

/**
 * Outcome of posting a claimed batch. `failed` matters because claiming a
 * batch DELETES the queue rows: an item that dies mid-post cannot be retried,
 * so the count has to come back to the admin rather than disappear.
 */
type PostResult = { posted: number; failed: number };

/** Tell the admin what didn't make it — those forwards have to be re-sent. */
function failedNote(failed: number): string {
  return failed > 0
    ? `\n⚠️ ${failed} couldn't be posted (download or save failed) — forward ${failed === 1 ? "it" : "them"} again.`
    : "";
}

/** Group-chat body cap (mirrors MAX_BODY on the chat POST route). */
const CHAT_MAX_BODY = 2000;
/**
 * Auto-delete window for the messages this bot posts into the Group Chat.
 * Group Chat is the one ephemeral section — every message there rolls off
 * after 7 days unless it is pinned — so a forwarded post follows the same
 * rule instead of quietly becoming permanent.
 */
const CHAT_TTL_S = 604_800;

/**
 * `[fwd:NAME]` banner + text, same contract as the in-app Forward action:
 * the post is authored by the forwarding ADMIN and names the original poster
 * in the banner. Only admins may create these tokens (the chat route strips
 * them from member posts to stop impersonation), which is exactly what this
 * admin-only webhook is.
 */
function chatForwardBody(origin: string, body: string): string {
  const clean =
    (origin || "a member")
      .replace(/[\]\n]/g, "")
      .replace(/^@+\s*/, "")
      .trim()
      .slice(0, 64) || "a member";
  const token = `[fwd:${clean}]\n`;
  return (
    token + (body ?? "").trim().slice(0, Math.max(0, CHAT_MAX_BODY - token.length))
  );
}

/**
 * Post a claimed batch into the live Group Chat.
 *
 * Chat rows differ from vouches in every way that matters here: ONE
 * attachment per message (no album mosaic), a real chat member as the author,
 * and a TTL. So each queued item posts as its own message, authored by the
 * admin who forwarded it, with the original poster named in the banner.
 */
async function postForwardToChat(
  rows: PendingForwardRow[],
  admin: { tgId: string; name: string },
): Promise<PostResult> {
  let posted = 0;
  let failed = 0;
  // The admin may never have opened the Mini App, and createChatMessage
  // resolves the author's avatar through chat_members — insert a stub row if
  // one is missing (never overwriting a real signed-in profile).
  await ensureChatMemberStub(admin.tgId, admin.name).catch(() => undefined);
  for (const r of rows) {
    try {
      let mediaId: string | null = null;
      let voiceToken: string | null = null;
      if (r.fileId) {
        const file = await downloadTelegramFile(r.fileId, r.mime);
        if (file) {
          if (r.kind === "video") {
            let posterId: string | null = null;
            if (r.thumbFileId) {
              const thumb = await downloadTelegramFile(r.thumbFileId);
              if (thumb) {
                posterId = await saveChatMedia(thumb.bytes, thumb.mime, r.w, r.h);
              }
            }
            mediaId = await saveChatMedia(file.bytes, file.mime, r.w, r.h, {
              kind: "video",
              duration: r.duration,
              posterId,
            });
          } else if (r.kind === "file") {
            mediaId = await saveChatMedia(
              file.bytes,
              "application/octet-stream",
              null,
              null,
              { kind: "file", name: r.fileName ?? "file" },
            );
          } else if (r.kind === "voice") {
            const voiceId = await saveChatMedia(file.bytes, file.mime);
            // A voice bubble's body must be EXACTLY the token — the renderer
            // anchors its match — so a forwarded voice note cannot also carry a
            // "Forwarded from" banner. The playable audio wins over the label
            // (the in-app Forward action makes the opposite trade and posts the
            // "🎤 Voice message" text instead, which loses the recording).
            voiceToken = `[voice:${voiceId}:${Math.max(0, Math.round(r.duration ?? 0))}:]`;
          } else {
            mediaId = await saveChatMedia(file.bytes, file.mime, r.w, r.h);
          }
        }
      }
      // A media forward whose download failed would otherwise post as an empty
      // "Forwarded from …" banner and be counted as a success.
      if (r.fileId && !mediaId && !voiceToken) {
        failed++;
        continue;
      }
      const body = voiceToken ?? chatForwardBody(r.author, r.body);
      if (!body && !mediaId) continue;
      const message = await createChatMessage({
        tgId: admin.tgId,
        authorName: admin.name,
        body,
        topic: "chat",
        mediaId,
        expiresAt: new Date(Date.now() + CHAT_TTL_S * 1000),
      });
      if (message) posted++;
      else failed++;
    } catch {
      // The queue rows were already claimed (deleted) — one bad item must not
      // take the rest of the batch down with it. Report the count instead.
      failed++;
    }
  }
  return { posted, failed };
}

function helpText(): string {
  return [
    "🤖 <b>Rose — community bot</b>",
    "",
    "Forward anything to me — text, photos, videos, GIFs, voice notes,",
    "audio or files. I'll queue it, then ask where the batch should post.",
    "Tap a button and everything queued posts there at once.",
    "",
    "You can also pick with a command after forwarding:",
    "/testimonials — post the queued batch to Client Testimonials",
    "/buy4u — post the queued batch to BUY4U Vouches",
    "/announcements — post the queued batch to Announcements",
    "/chat — post the queued batch to the Group Chat",
    "",
    "Group Chat posts show a “Forwarded from …” banner and auto-delete",
    "after 7 days unless you pin them — the other sections keep posts",
    "forever.",
    "",
    "/status — show post counts",
    "",
    "🧩 New emoji pack? Send me any message containing its custom emoji",
    "and I'll add the whole pack to the site.",
  ].join("\n");
}

/**
 * Post a claimed batch of queued forwards to a section. Album parts (same
 * media_group_id) collapse back into ONE post with all photos; everything
 * else posts individually. Returns the number of posts created (duplicates
 * are silently skipped by the vouch dedupe hash).
 */
/**
 * Only visual media collapses into one album bubble. Telegram also groups
 * documents and audio, but a download row or a voice player shares no layout
 * with a photo mosaic — those post one bubble each.
 */
function isGroupable(r: PendingForwardRow): boolean {
  return r.kind === "photo" || r.kind === "video";
}

async function postForwardBatch(
  rows: PendingForwardRow[],
  section: VouchSection,
  chatId: string | number,
): Promise<PostResult> {
  const groups = new Map<string, PendingForwardRow[]>();
  for (const r of rows) {
    const key =
      r.mediaGroupId && isGroupable(r) ? `mg|${r.mediaGroupId}` : `one|${r.id}`;
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  let posted = 0;
  let failed = 0;
  for (const parts of groups.values()) {
    try {
      const first = parts[0];
      const body = parts.map((p) => p.body).find((b) => b.trim()) ?? "";
      // Section is part of BOTH hashes: posting the same album/message to a
      // second section must not be silently swallowed by the vouches dedupe
      // index (it also shields late album stragglers from colliding with an
      // already-posted batch in a different section).
      // The hash must follow the SAME grouping rule as the key above. Telegram
      // also groups documents and audio, but those post one bubble each — hash
      // them on the media group and every item after the first collides with
      // the album hash and silently vanishes behind the unique dedupe index.
      const grouped = parts.length > 1 || isGroupable(first);
      const dedupe =
        first.mediaGroupId && grouped
          ? sha256Hex(`mg|${chatId}|${first.mediaGroupId}|${section}`)
          : sha256Hex(
              // Distinct files have distinct unique ids, so ungrouped album
              // parts no longer collide; text-only forwards keep their old
              // content hash (re-forwarding the same text stays a no-op).
              `${section}|${first.author}|${body}|${first.fileUniqueId ?? ""}`,
            );
      const vouchId = await createVouch({
        section,
        authorName: first.author,
        body,
        originChatId: chatId,
        originMsgId: first.originMsgId,
        mediaGroupId: first.mediaGroupId,
        dedupeHash: dedupe,
        originDate: first.originDate,
      });
      if (!vouchId) continue; // dedupe hit — identical post already exists
      for (const p of parts) {
        if (!p.fileId) continue;
        const file = await downloadTelegramFile(p.fileId, p.mime);
        if (!file) continue;
        if (p.kind === "video") {
          // The poster frame is its own row (kind='poster', excluded from the
          // vouch's media list) so the bubble can show the thumbnail without
          // ever fetching the clip — scrolling past a video costs a thumb.
          let posterId: string | null = null;
          if (p.thumbFileId) {
            const thumb = await downloadTelegramFile(p.thumbFileId);
            if (thumb) {
              posterId = await addVouchMedia(
                vouchId,
                thumb.bytes,
                thumb.mime,
                sha256Hex(thumb.bytes),
                { kind: "poster" },
              );
            }
          }
          await addVouchMedia(
            vouchId,
            file.bytes,
            file.mime,
            sha256Hex(file.bytes),
            {
              kind: "video",
              duration: p.duration,
              posterId,
              w: p.w,
              h: p.h,
            },
          );
          continue;
        }
        if (p.kind === "voice") {
          await addVouchMedia(
            vouchId,
            file.bytes,
            file.mime,
            sha256Hex(file.bytes),
            { kind: "voice", duration: p.duration },
          );
          continue;
        }
        if (p.kind === "file") {
          // Documents are served as an attachment download, never inline under
          // their own mime (an HTML/SVG blob rendered same-origin would be
          // stored XSS) — the stored mime matches how it leaves the server.
          await addVouchMedia(
            vouchId,
            file.bytes,
            "application/octet-stream",
            sha256Hex(file.bytes),
            { kind: "file", name: p.fileName ?? "file" },
          );
          continue;
        }
        await addVouchMedia(
          vouchId,
          file.bytes,
          file.mime,
          sha256Hex(file.bytes),
        );
      }
      posted++;
    } catch {
      // Claiming the batch DELETED its queue rows, so a failure here cannot
      // be retried — one bad item must not abort the whole batch. The count
      // goes back to the admin instead of vanishing.
      failed++;
    }
  }
  return { posted, failed };
}

const FWD_KEYBOARD = [
  [{ text: "💬 Client Testimonials", callbackData: "fwd:post:testimonials" }],
  [{ text: "🛍 BUY4U Vouches", callbackData: "fwd:post:buy4u" }],
  [{ text: "📣 Announcements", callbackData: "fwd:post:announcements" }],
  [{ text: "👥 Group Chat", callbackData: "fwd:post:chat" }],
  [{ text: "🗑 Discard batch", callbackData: "fwd:clear" }],
];

export async function POST(req: Request) {
  const secret = process.env.COMMUNITY_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await req.json().catch(() => null)) as TgUpdate | null;

  // ── destination-picker callbacks ─────────────────────────────────────
  const cb = update?.callback_query;
  if (cb) {
    if (!isCommunityAdmin(cb.from?.id)) {
      await answerCallbackQuery(cb.id, "Admins only.");
      return NextResponse.json({ ok: true });
    }
    const cbChatId = cb.message?.chat?.id;
    if (cbChatId === undefined || cbChatId === null) {
      await answerCallbackQuery(cb.id);
      return NextResponse.json({ ok: true });
    }
    const data = cb.data ?? "";
    if (data === "fwd:clear") {
      const rows = await claimPendingForwards(cbChatId);
      await answerCallbackQuery(
        cb.id,
        rows.length ? `Discarded ${rows.length}.` : "Nothing queued.",
      );
      if (cb.message?.message_id) {
        await editCommunityMessage(
          cbChatId,
          cb.message.message_id,
          `🗑 Discarded <b>${rows.length}</b> queued forward${rows.length === 1 ? "" : "s"}.`,
        );
      }
      return NextResponse.json({ ok: true });
    }
    const pick = /^fwd:post:(testimonials|buy4u|announcements|chat)$/.exec(
      data,
    );
    if (pick) {
      const dest = pick[1] as ForwardDest;
      const actorId =
        cb.from?.id !== undefined && cb.from?.id !== null
          ? String(cb.from.id)
          : null;
      const actorName =
        fullName(cb.from?.first_name, cb.from?.last_name) ?? "Admin";
      // A Group Chat post is authored by the admin who tapped, so it needs a
      // real member id. Bail out BEFORE claiming (claiming deletes the queue)
      // and never silently reroute the batch to a different destination.
      if (dest === "chat" && !actorId) {
        await answerCallbackQuery(
          cb.id,
          "Couldn't identify you — send /chat instead.",
        );
        return NextResponse.json({ ok: true });
      }
      const rows = await claimPendingForwards(cbChatId);
      if (rows.length === 0) {
        // Double-tap or a second admin device — the batch was already drained.
        await answerCallbackQuery(cb.id, "Nothing queued — already handled.");
        if (cb.message?.message_id) {
          await editCommunityMessage(
            cbChatId,
            cb.message.message_id,
            "Nothing left to post — this batch was already handled.",
          );
        }
        return NextResponse.json({ ok: true });
      }
      const { posted, failed } =
        dest === "chat" && actorId
          ? await postForwardToChat(rows, { tgId: actorId, name: actorName })
          : await postForwardBatch(rows, dest as VouchSection, cbChatId);
      await answerCallbackQuery(
        cb.id,
        `Posted ${posted} to ${destLabel(dest)}.`,
      );
      if (cb.message?.message_id) {
        await editCommunityMessage(
          cbChatId,
          cb.message.message_id,
          `✅ Posted <b>${posted}</b> post${posted === 1 ? "" : "s"} to <b>${destLabel(dest)}</b>.${
            dest === "chat"
              ? " They auto-delete in 7 days unless you pin them."
              : ""
          }${failedNote(failed)}`,
        );
      }
      await recordAction({
        actorTgId: actorId,
        actorName,
        action: "vouch_ingested",
        target: dest,
        meta: { count: posted },
      }).catch(() => undefined);
      if (posted > 0) {
        // Fan out to opted-in subscribers (fail-soft — must never fail the 200).
        await notifyCategory(dest, {
          title: dest === "chat" ? "Group Chat is active" : `New ${destLabel(dest)}`,
          body:
            dest === "chat"
              ? posted === 1
                ? "A new message is up in the Group Chat."
                : `${posted} new messages are up in the Group Chat.`
              : posted === 1
                ? "A new post is up on the community."
                : `${posted} new posts are up on the community.`,
          url: dest === "chat" ? "/community#chat" : "/community",
        }).catch(() => undefined);
      }
      return NextResponse.json({ ok: true });
    }
    await answerCallbackQuery(cb.id);
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = msg.chat?.id;
  if (chatId === undefined || chatId === null) {
    return NextResponse.json({ ok: true });
  }

  const fromId = msg.from?.id;

  // @everyone reachability ledger: Telegram only lets a bot DM users who
  // started it, so everyone who DMs the bot ("/start" included) is recorded
  // here — the owner's @everyone broadcast fans out to this table PLUS Mini
  // App members. Fire-and-forget: recording must never delay the reply.
  void recordCommunityBotUser(
    chatId,
    fullName(msg.from?.first_name, msg.from?.last_name) ?? "",
  ).catch(() => undefined);

  if (!isCommunityAdmin(fromId)) {
    // Members hit this gate before the slash-command block, so their Mini App
    // launcher MUST live here — without it Mini-App-only access locks them out.
    await sendCommunityTelegram(
      chatId,
      "👋 Welcome to the RefundGod community! Tap the button below to open the community — chat, vouches and announcements live there.",
      {
        text: "🚀 Open Community",
        webAppUrl: communityMiniAppUrl(communityBase()),
      },
    );
    return NextResponse.json({ ok: true });
  }

  const text = (msg.text ?? "").trim();
  // What (if anything) this message is carrying. Needed before the emoji
  // block so a media message is never mistaken for a "teach this pack" DM.
  const pick = pickAttachment(msg);

  // ── emoji-pack teaching ──────────────────────────────────────────────
  // Native Telegram apps copy custom emoji as BARE unicode, so a pasted
  // unknown-pack emoji can never be resolved on the website. The one place
  // the document ids still travel is a Telegram message's entities — so any
  // admin message/forward containing custom emoji teaches the library its
  // packs right here. Forwards keep flowing into the ingestion queue below;
  // a message that is ONLY custom emoji (the deliberate "teach this" DM) is
  // answered and consumed so it never becomes a queued vouch by accident.
  const ceIds = [
    ...(msg.entities ?? []),
    ...(msg.caption_entities ?? []),
  ]
    .filter((e) => e.type === "custom_emoji" && e.custom_emoji_id)
    .map((e) => e.custom_emoji_id as string);
  if (ceIds.length > 0) {
    const titles = await learnEmojiPacksFromIds(ceIds);
    if (titles.length > 0) {
      await sendCommunityTelegram(
        chatId,
        `🧩 Added emoji pack${titles.length === 1 ? "" : "s"}: <b>${titles
          .map((t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
          .join("</b>, <b>")}</b> — the whole pack now works on the site (picker + pastes).`,
      );
    }
    const emojiOnly =
      !msg.caption &&
      !pick.att &&
      !pick.reject &&
      !msg.forward_origin &&
      !msg.forward_from &&
      !msg.forward_sender_name &&
      text
        .replace(/[0-9#*]\uFE0F?\u20E3/gu, "")
        .replace(
          /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\s|\uFE0F|\u200D/gu,
          "",
        ) === "";
    if (emojiOnly) {
      if (titles.length === 0) {
        await sendCommunityTelegram(
          chatId,
          "✅ Every emoji in that message is already in the site's library. If one still shows as a plain emoji on the site, reopen the community (fresh load) and paste again.",
        );
      }
      return NextResponse.json({ ok: true });
    }
  }

  // ── slash commands ───────────────────────────────────────────────────
  if (text.startsWith("/")) {
    const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
    if (cmd === "/start" || cmd === "/help") {
      await sendCommunityTelegram(chatId, helpText(), {
        text: "🚀 Open Community",
        webAppUrl: communityMiniAppUrl(communityBase()),
      });
      return NextResponse.json({ ok: true });
    }
    if (
      cmd === "/testimonials" ||
      cmd === "/buy4u" ||
      cmd === "/announcements" ||
      cmd === "/announce" ||
      cmd === "/chat" ||
      cmd === "/groupchat"
    ) {
      // Command fallback for the destination keyboard: posts whatever is
      // queued right now to the named destination.
      const dest: ForwardDest =
        cmd === "/buy4u"
          ? "buy4u"
          : cmd === "/announcements" || cmd === "/announce"
            ? "announcements"
            : cmd === "/chat" || cmd === "/groupchat"
              ? "chat"
              : "testimonials";
      const actorId =
        fromId !== undefined && fromId !== null ? String(fromId) : null;
      const actorName =
        fullName(msg.from?.first_name, msg.from?.last_name) ?? "Admin";
      // Group Chat needs the admin's own member id as the author. Refuse
      // BEFORE claiming (claiming deletes the queue) rather than rerouting
      // the batch somewhere the admin didn't ask for.
      if (dest === "chat" && !actorId) {
        await sendCommunityTelegram(
          chatId,
          "Couldn't identify you, so I didn't post anything — your batch is still queued.",
        );
        return NextResponse.json({ ok: true });
      }
      const rows = await claimPendingForwards(chatId);
      if (rows.length === 0) {
        await sendCommunityTelegram(
          chatId,
          `Nothing queued. Forward messages first — I'll ask where to post them (or send ${cmd} right after forwarding).`,
        );
        return NextResponse.json({ ok: true });
      }
      const { posted, failed } =
        dest === "chat" && actorId
          ? await postForwardToChat(rows, { tgId: actorId, name: actorName })
          : await postForwardBatch(rows, dest as VouchSection, chatId);
      await sendCommunityTelegram(
        chatId,
        `✅ Posted <b>${posted}</b> post${posted === 1 ? "" : "s"} to <b>${destLabel(dest)}</b>.${
          dest === "chat"
            ? " They auto-delete in 7 days unless you pin them."
            : ""
        }${failedNote(failed)}`,
      );
      await recordAction({
        actorTgId: actorId,
        actorName,
        action: "vouch_ingested",
        target: dest,
        meta: { count: posted },
      }).catch(() => undefined);
      if (posted > 0) {
        await notifyCategory(dest, {
          title: dest === "chat" ? "Group Chat is active" : `New ${destLabel(dest)}`,
          body:
            dest === "chat"
              ? posted === 1
                ? "A new message is up in the Group Chat."
                : `${posted} new messages are up in the Group Chat.`
              : posted === 1
                ? "A new post is up on the community."
                : `${posted} new posts are up on the community.`,
          url: dest === "chat" ? "/community#chat" : "/community",
        }).catch(() => undefined);
      }
      return NextResponse.json({ ok: true });
    }
    if (cmd === "/status") {
      const [t, b, a] = await Promise.all([
        countVouches("testimonials"),
        countVouches("buy4u"),
        countVouches("announcements"),
      ]);
      await sendCommunityTelegram(
        chatId,
        `📊 Client Testimonials: ${t}\nBUY4U Vouches: ${b}\nAnnouncements: ${a}`,
      );
      return NextResponse.json({ ok: true });
    }
    await sendCommunityTelegram(chatId, "Unknown command. Send /help.");
    return NextResponse.json({ ok: true });
  }

  // ── content ingestion → queue + destination keyboard ─────────────────
  // Preserve premium custom emoji as [ce:] tokens and real hyperlinks as
  // [label](url) tokens (entities are the ONLY place their document ids /
  // URLs travel); the pack-teaching block above has already cached the
  // artwork for these very ids.
  const body = (
    msg.text != null
      ? spliceEntityTokens(msg.text, msg.entities)
      : spliceEntityTokens(msg.caption ?? "", msg.caption_entities)
  ).trim();
  // An attachment the bot cannot ingest (over Telegram's 20 MB bot download
  // limit, or an animated sticker) must SAY so — silently returning 200 is
  // exactly why forwarding a video used to look like the bot was dead.
  if (pick.reject) {
    await sendCommunityTelegram(chatId, pick.reject);
    return NextResponse.json({ ok: true });
  }
  const att = pick.att;
  if (!body && !att) return NextResponse.json({ ok: true });

  // An abandoned queue must never post days later by surprise.
  await purgeStalePendingForwards().catch(() => undefined);

  const author =
    authorFromForward(msg) ??
    fullName(msg.from?.first_name, msg.from?.last_name) ??
    "Anonymous";
  // A forward carries the ORIGINAL post's timestamp in forward_origin.date;
  // msg.date is merely when the forward landed in this chat. Prefer the
  // original so imported vouches keep their true history instead of all
  // stamping "today".
  const fwdTs = msg.forward_origin?.date;
  const originDate = fwdTs
    ? new Date(fwdTs * 1000)
    : msg.date
      ? new Date(msg.date * 1000)
      : null;
  const mediaGroupId = msg.media_group_id ?? null;

  // One outstanding batch per chat: everything forwarded before a destination
  // is picked belongs to the same batch (that's what makes bulk forwards a
  // single prompt + single tap).
  const batchKey = `chat:${chatId}`;
  await enqueuePendingForward({
    chatId,
    batchKey,
    author,
    body,
    fileId: att?.fileId ?? null,
    fileUniqueId: att?.fileUniqueId ?? null,
    mediaGroupId,
    originMsgId: msg.message_id,
    originDate,
    kind: att?.kind ?? "photo",
    mime: att?.mime ?? null,
    duration: att?.duration ?? null,
    fileName: att?.fileName ?? null,
    thumbFileId: att?.thumbFileId ?? null,
    w: att?.w ?? null,
    h: att?.h ?? null,
  });

  // Exactly ONE keyboard per outstanding batch — album parts and bulk
  // forwards race here, and only the ledger winner prompts.
  const winner = await claimForwardPrompt(batchKey, chatId);
  if (winner) {
    const sent = await sendCommunityKeyboard(
      chatId,
      "📥 Queued. Where should this batch post? Keep forwarding — everything queued posts together when you pick.",
      FWD_KEYBOARD,
    );
    if (sent.ok && sent.messageId) {
      await setForwardPromptMsg(batchKey, sent.messageId).catch(() => undefined);
    }
  } else {
    // The batch already has a keyboard — but if it has sat unanswered long
    // enough to scroll out of view (forward more the next day and the bot
    // looks mute), retire the old keyboard and send a fresh one at the
    // bottom of the chat. The 2-minute floor keeps album parts and rapid
    // bulk forwards from spamming keyboards; the atomic re-claim keeps
    // Render's multi-worker webhook delivery to a single re-prompt. This
    // also self-heals a batch whose original keyboard send failed.
    const refresh = await claimForwardPromptRefresh(batchKey, 120);
    if (refresh.won) {
      if (refresh.oldMsgId !== null) {
        await editCommunityMessage(
          chatId,
          refresh.oldMsgId,
          "⬇️ More forwards queued — pick a destination on the newest prompt below.",
        );
      }
      const sent = await sendCommunityKeyboard(
        chatId,
        "📥 Queued (batch still open). Where should everything post? Keep forwarding — it all posts together when you pick.",
        FWD_KEYBOARD,
      );
      if (sent.ok && sent.messageId) {
        await setForwardPromptMsg(batchKey, sent.messageId).catch(
          () => undefined,
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
