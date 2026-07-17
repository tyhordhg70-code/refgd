import { NextResponse } from "next/server";
import {
  isCommunityAdmin,
  sendCommunityTelegram,
  sendCommunityKeyboard,
  answerCallbackQuery,
  editCommunityMessage,
  downloadTelegramFile,
  sha256Hex,
} from "@/lib/community-bot";
import {
  createVouch,
  addVouchMedia,
  countVouches,
  recordAction,
  enqueuePendingForward,
  claimForwardPrompt,
  claimForwardPromptRefresh,
  setForwardPromptMsg,
  claimPendingForwards,
  purgeStalePendingForwards,
  learnEmojiPacksFromIds,
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
type TgMessage = {
  message_id: number;
  date?: number;
  text?: string;
  caption?: string;
  media_group_id?: string;
  chat?: { id?: number | string };
  from?: { id?: number | string; first_name?: string; last_name?: string };
  photo?: TgPhotoSize[];
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

function sectionLabel(s: VouchSection): string {
  return s === "buy4u"
    ? "BUY4U Vouches"
    : s === "announcements"
      ? "Announcements"
      : "Client Testimonials";
}

function helpText(): string {
  return [
    "🤖 <b>Rose — community bot</b>",
    "",
    "Forward messages to me — I'll queue them, then ask where the batch",
    "should post. Tap a button and everything queued posts there at once.",
    "",
    "You can also pick with a command after forwarding:",
    "/testimonials — post the queued batch to Client Testimonials",
    "/buy4u — post the queued batch to BUY4U Vouches",
    "/announcements — post the queued batch to Announcements",
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
async function postForwardBatch(
  rows: PendingForwardRow[],
  section: VouchSection,
  chatId: string | number,
): Promise<number> {
  const groups = new Map<string, PendingForwardRow[]>();
  for (const r of rows) {
    const key = r.mediaGroupId ? `mg|${r.mediaGroupId}` : `one|${r.id}`;
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  let posted = 0;
  for (const parts of groups.values()) {
    const first = parts[0];
    const body = parts.map((p) => p.body).find((b) => b.trim()) ?? "";
    // Section is part of BOTH hashes: posting the same album/message to a
    // second section must not be silently swallowed by the vouches dedupe
    // index (it also shields late album stragglers from colliding with an
    // already-posted batch in a different section).
    const dedupe = first.mediaGroupId
      ? sha256Hex(`mg|${chatId}|${first.mediaGroupId}|${section}`)
      : sha256Hex(
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
      const file = await downloadTelegramFile(p.fileId);
      if (file) {
        await addVouchMedia(
          vouchId,
          file.bytes,
          file.mime,
          sha256Hex(file.bytes),
        );
      }
    }
    posted++;
  }
  return posted;
}

const FWD_KEYBOARD = [
  [{ text: "💬 Client Testimonials", callbackData: "fwd:post:testimonials" }],
  [{ text: "🛍 BUY4U Vouches", callbackData: "fwd:post:buy4u" }],
  [{ text: "📣 Announcements", callbackData: "fwd:post:announcements" }],
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
    const pick = /^fwd:post:(testimonials|buy4u|announcements)$/.exec(data);
    if (pick) {
      const section = pick[1] as VouchSection;
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
      const posted = await postForwardBatch(rows, section, cbChatId);
      await answerCallbackQuery(
        cb.id,
        `Posted ${posted} to ${sectionLabel(section)}.`,
      );
      if (cb.message?.message_id) {
        await editCommunityMessage(
          cbChatId,
          cb.message.message_id,
          `✅ Posted <b>${posted}</b> post${posted === 1 ? "" : "s"} to <b>${sectionLabel(section)}</b>.`,
        );
      }
      await recordAction({
        actorTgId: cb.from?.id !== undefined && cb.from?.id !== null ? String(cb.from.id) : null,
        actorName: fullName(cb.from?.first_name, cb.from?.last_name) ?? "Admin",
        action: "vouch_ingested",
        target: section,
        meta: { count: posted },
      }).catch(() => undefined);
      if (posted > 0) {
        // Fan out to opted-in subscribers (fail-soft — must never fail the 200).
        await notifyCategory(section, {
          title: `New ${sectionLabel(section)}`,
          body:
            posted === 1
              ? "A new post is up on the community."
              : `${posted} new posts are up on the community.`,
          url: "/community",
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
  if (!isCommunityAdmin(fromId)) {
    // Members hit this gate before the slash-command block, so their Mini App
    // launcher MUST live here — without it Mini-App-only access locks them out.
    await sendCommunityTelegram(
      chatId,
      "👋 Welcome to the RefundGod community! Tap the button below to open the community — chat, vouches and announcements live there.",
      {
        text: "🚀 Open Community",
        webAppUrl: `${communityBase()}/community`,
      },
    );
    return NextResponse.json({ ok: true });
  }

  const text = (msg.text ?? "").trim();

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
      (msg.photo ?? []).length === 0 &&
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
        webAppUrl: `${communityBase()}/community`,
      });
      return NextResponse.json({ ok: true });
    }
    if (
      cmd === "/testimonials" ||
      cmd === "/buy4u" ||
      cmd === "/announcements" ||
      cmd === "/announce"
    ) {
      // Command fallback for the destination keyboard: posts whatever is
      // queued right now to the named section.
      const section: VouchSection =
        cmd === "/buy4u"
          ? "buy4u"
          : cmd === "/announcements" || cmd === "/announce"
            ? "announcements"
            : "testimonials";
      const rows = await claimPendingForwards(chatId);
      if (rows.length === 0) {
        await sendCommunityTelegram(
          chatId,
          `Nothing queued. Forward messages first — I'll ask where to post them (or send /${section === "testimonials" ? "testimonials" : section} right after forwarding).`,
        );
        return NextResponse.json({ ok: true });
      }
      const posted = await postForwardBatch(rows, section, chatId);
      await sendCommunityTelegram(
        chatId,
        `✅ Posted <b>${posted}</b> post${posted === 1 ? "" : "s"} to <b>${sectionLabel(section)}</b>.`,
      );
      await recordAction({
        actorTgId:
          fromId !== undefined && fromId !== null ? String(fromId) : null,
        actorName: fullName(msg.from?.first_name, msg.from?.last_name) ?? "Admin",
        action: "vouch_ingested",
        target: section,
        meta: { count: posted },
      }).catch(() => undefined);
      if (posted > 0) {
        await notifyCategory(section, {
          title: `New ${sectionLabel(section)}`,
          body:
            posted === 1
              ? "A new post is up on the community."
              : `${posted} new posts are up on the community.`,
          url: "/community",
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
  const photos = msg.photo ?? [];
  if (!body && photos.length === 0) return NextResponse.json({ ok: true });

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
  const largest = photos.length ? photos[photos.length - 1] : null;

  // One outstanding batch per chat: everything forwarded before a destination
  // is picked belongs to the same batch (that's what makes bulk forwards a
  // single prompt + single tap).
  const batchKey = `chat:${chatId}`;
  await enqueuePendingForward({
    chatId,
    batchKey,
    author,
    body,
    fileId: largest?.file_id ?? null,
    fileUniqueId: largest?.file_unique_id ?? null,
    mediaGroupId,
    originMsgId: msg.message_id,
    originDate,
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
