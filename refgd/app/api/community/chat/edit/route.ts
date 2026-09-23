import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  discoverMessageEmoji,
  editChatMessage,
  getMessageEditInfo,
  getChatMemberModState,
  matchBlocklist,
  recordAction,
  rewriteMentions,
  saveChatMedia,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 2000;

/** Same 3 MB photo cap as the send path (client downscales before upload). */
const MAX_MEDIA_BYTES = 3 * 1024 * 1024;

/**
 * Sniff the actual image type from magic bytes — never trust the client's
 * declared Content-Type for stored/served media. (Copy of the send route's
 * sniffer; keep in sync.)
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
 * POST /api/community/chat/edit — edit a message body in place. Accepts JSON
 * (text-only edit) or multipart/form-data with a `photo` field, which ATTACHES
 * an image to a text-only message (Telegram parity: pasting an image into the
 * composer while editing).
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
  let photo: {
    bytes: Buffer;
    mime: string;
    w: number | null;
    h: number | null;
  } | null = null;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    // Reject oversized bodies BEFORE formData() buffers them in memory.
    const bodyLen = Number(req.headers.get("content-length"));
    if (
      Number.isFinite(bodyLen) &&
      bodyLen > MAX_MEDIA_BYTES + 64 * 1024
    ) {
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
    payload = { id: form.get("id"), body: form.get("text") };
    const file = form.get("photo");
    if (file instanceof Blob) {
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
      // Intrinsic pixel size measured client-side during the downscale, so
      // the bubble can reserve layout space before the image loads.
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
    }
  } else {
    try {
      payload = (await req.json()) as { id?: unknown; body?: unknown };
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }
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

  let body = typeof payload.body === "string" ? payload.body.trim() : "";
  // Mirror the chat POST token shielding: only admins may carry "Forwarded
  // from …" banners, and [voice:…]/[poll:…] tokens are server-composed only.
  // Without this an edit could smuggle a spoofed forward header or point a
  // voice/poll bubble at arbitrary ids, bypassing the POST-only strip.
  if (!me.admin) {
    body = body.replace(/^(?:\[fwd:[^\]\n]{1,64}\]\n?)+/, "").trim();
  }
  body = body.replace(/\[(?:voice|poll):[^\]\n]*\]/g, "").trim();
  if (!body && !photo) {
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
  // Forwarded messages (leading [fwd:NAME] token) mirror someone else's
  // words — editing them would let the banner attribute invented text to the
  // original sender, so they can't be edited at all (Telegram parity).
  if (/^\[fwd:/.test(info.body)) {
    return NextResponse.json(
      { ok: false, error: "Forwarded messages can't be edited" },
      { status: 403 },
    );
  }
  // Adding a photo on edit is only defined for a text-only message — real
  // Telegram can also SWAP media, but that needs album/poster bookkeeping we
  // don't do here, so media messages stay media-locked for now.
  if (photo && info.mediaId) {
    return NextResponse.json(
      { ok: false, error: "That message already has media" },
      { status: 409 },
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

  // @Display-Name mentions: same server-side rewrite as a fresh post — the
  // edit composer seeds tokens back as plain `@Name` text, so re-matching
  // here keeps mentions blue (and un-matching text plain) after an edit.
  body = await rewriteMentions(body);
  if (!body && !photo) {
    return NextResponse.json(
      { ok: false, error: "Message is empty" },
      { status: 400 },
    );
  }

  // An edit can paste in new foreign-pack custom emoji too — same discovery
  // as the send path (fail-soft, cache-first serve route).
  await discoverMessageEmoji(body);

  // Save the photo first — if the UPDATE then fails, the orphaned media row
  // is simply unreachable (no message references its id).
  const mediaId = photo
    ? await saveChatMedia(photo.bytes, photo.mime, photo.w, photo.h)
    : null;
  const message = await editChatMessage(id, body, me.tid, mediaId);
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
    meta: { id, mediaAdded: Boolean(mediaId) },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, message });
}
