import { NextResponse } from "next/server";
import {
  isCommunityAdmin,
  sendCommunityTelegram,
  downloadTelegramFile,
  sha256Hex,
} from "@/lib/community-bot";
import {
  createVouch,
  addVouchMedia,
  findVouchByMediaGroup,
  updateVouchBodyIfEmpty,
  getActiveSection,
  setActiveSection,
  countVouches,
  recordAction,
  type VouchSection,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/community/webhook
 *
 * The community ingestion bot. An admin (COMMUNITY_ADMIN_TG_IDS) DMs/forwards
 * to the bot; the message is auto-posted to the currently-active section
 * (Client Testimonials / BUY4U Vouches / Announcements) preserving the
 * original author's name and photo. All content is stored permanently in
 * Postgres — the bot holds no state. Non-admins get a friendly pointer to the
 * group. The webhook is protected by COMMUNITY_WEBHOOK_SECRET.
 */

type TgPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};
type TgForwardOrigin =
  | { type: "user"; sender_user: { first_name?: string; last_name?: string } }
  | { type: "hidden_user"; sender_user_name: string }
  | { type: "chat"; sender_chat: { title?: string } }
  | { type: "channel"; chat: { title?: string } };
type TgMessage = {
  message_id: number;
  date?: number;
  text?: string;
  caption?: string;
  media_group_id?: string;
  chat?: { id?: number | string };
  from?: { id?: number | string; first_name?: string; last_name?: string };
  photo?: TgPhotoSize[];
  forward_origin?: TgForwardOrigin;
  forward_from?: { first_name?: string; last_name?: string };
  forward_sender_name?: string;
};
type TgUpdate = { update_id?: number; message?: TgMessage };

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
    "🤖 <b>RefundGod community bot</b>",
    "",
    "Pick where forwards should post, then forward the messages:",
    "/testimonials — Client Testimonials",
    "/buy4u — BUY4U Vouches",
    "/announcements — Announcements",
    "",
    "/status — show the active section and post counts",
  ].join("\n");
}

export async function POST(req: Request) {
  const secret = process.env.COMMUNITY_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  const msg = update?.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = msg.chat?.id;
  if (chatId === undefined || chatId === null) {
    return NextResponse.json({ ok: true });
  }

  const fromId = msg.from?.id;
  if (!isCommunityAdmin(fromId)) {
    await sendCommunityTelegram(
      chatId,
      "👋 This is the RefundGod community bot. Join the group at https://t.me/refundgod",
    );
    return NextResponse.json({ ok: true });
  }

  const text = (msg.text ?? "").trim();

  // ── slash commands ───────────────────────────────────────────────────
  if (text.startsWith("/")) {
    const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
    if (cmd === "/start" || cmd === "/help") {
      await sendCommunityTelegram(chatId, helpText());
      return NextResponse.json({ ok: true });
    }
    if (
      cmd === "/testimonials" ||
      cmd === "/buy4u" ||
      cmd === "/announcements" ||
      cmd === "/announce"
    ) {
      const section: VouchSection =
        cmd === "/buy4u"
          ? "buy4u"
          : cmd === "/announcements" || cmd === "/announce"
            ? "announcements"
            : "testimonials";
      await setActiveSection(section);
      await sendCommunityTelegram(
        chatId,
        `✅ Active section set to <b>${sectionLabel(section)}</b>. Forward messages now and they'll post there.`,
      );
      return NextResponse.json({ ok: true });
    }
    if (cmd === "/status") {
      const section = await getActiveSection();
      const [t, b, a] = await Promise.all([
        countVouches("testimonials"),
        countVouches("buy4u"),
        countVouches("announcements"),
      ]);
      await sendCommunityTelegram(
        chatId,
        `📊 Active: <b>${sectionLabel(section)}</b>\nClient Testimonials: ${t}\nBUY4U Vouches: ${b}\nAnnouncements: ${a}`,
      );
      return NextResponse.json({ ok: true });
    }
    await sendCommunityTelegram(chatId, "Unknown command. Send /help.");
    return NextResponse.json({ ok: true });
  }

  // ── content ingestion ─────────────────────────────────────────────────
  const body = (msg.text ?? msg.caption ?? "").trim();
  const photos = msg.photo ?? [];
  if (!body && photos.length === 0) return NextResponse.json({ ok: true });

  const section = await getActiveSection();
  const author =
    authorFromForward(msg) ??
    fullName(msg.from?.first_name, msg.from?.last_name) ??
    "Anonymous";
  const originDate = msg.date ? new Date(msg.date * 1000) : null;
  const mediaGroupId = msg.media_group_id ?? null;
  const largest = photos.length ? photos[photos.length - 1] : null;

  let vouchId: string | null = null;
  if (mediaGroupId) {
    vouchId = await findVouchByMediaGroup(chatId, mediaGroupId);
  }

  if (!vouchId) {
    const dedupe = mediaGroupId
      ? sha256Hex(`mg|${chatId}|${mediaGroupId}`)
      : sha256Hex(
          `${section}|${author}|${body}|${largest?.file_unique_id ?? ""}`,
        );
    vouchId = await createVouch({
      section,
      authorName: author,
      body,
      originChatId: chatId,
      originMsgId: msg.message_id,
      mediaGroupId,
      dedupeHash: dedupe,
      originDate,
    });
    // A concurrent album part may have created the row first.
    if (!vouchId && mediaGroupId) {
      vouchId = await findVouchByMediaGroup(chatId, mediaGroupId);
    }
  } else if (body) {
    await updateVouchBodyIfEmpty(vouchId, body);
  }

  if (vouchId && largest) {
    const file = await downloadTelegramFile(largest.file_id);
    if (file) {
      await addVouchMedia(vouchId, file.bytes, file.mime, sha256Hex(file.bytes));
    }
  }

  // Confirm once per logical post (not per album part) to avoid chat spam.
  if (vouchId && !mediaGroupId) {
    await recordAction({
      actorTgId: fromId !== undefined && fromId !== null ? String(fromId) : null,
      actorName: author,
      action: "vouch_ingested",
      target: section,
    });
    await sendCommunityTelegram(
      chatId,
      `✅ Posted to <b>${sectionLabel(section)}</b>${largest ? " (with photo)" : ""}.`,
    );
  }

  return NextResponse.json({ ok: true });
}
