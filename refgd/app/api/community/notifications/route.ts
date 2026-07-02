import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  upsertPushSub,
  setTelegramNotify,
  deletePushSub,
  getMemberNotifState,
  sanitizeCategories,
  type PushKeys,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  — current opt-in state for the signed-in member + the public VAPID key.
 * POST — save a web-push subscription and/or Telegram opt-in with categories.
 * DELETE — remove a web-push subscription by endpoint.
 * All member-gated; category lists are sanitized server-side.
 */
export async function GET() {
  const me = await readMemberSession();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
  if (!me) {
    return NextResponse.json({ member: null, publicKey, web: [], telegram: [] });
  }
  const state = await getMemberNotifState(me.tid);
  return NextResponse.json({
    member: { tid: me.tid, admin: me.admin },
    publicKey,
    web: state.web,
    telegram: state.telegram,
  });
}

export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }

  let body: {
    subscription?: { endpoint?: unknown; keys?: unknown };
    categories?: unknown;
    telegram?: unknown;
    telegramCategories?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Web push subscription (optional)
  const sub = body.subscription;
  if (sub && typeof sub.endpoint === "string" && sub.endpoint) {
    const keys = sub.keys as { p256dh?: unknown; auth?: unknown } | undefined;
    if (
      !keys ||
      typeof keys.p256dh !== "string" ||
      typeof keys.auth !== "string"
    ) {
      return NextResponse.json(
        { ok: false, error: "Missing subscription keys" },
        { status: 400 },
      );
    }
    const categories = sanitizeCategories(body.categories);
    const pk: PushKeys = { p256dh: keys.p256dh, auth: keys.auth };
    await upsertPushSub(me.tid, sub.endpoint, pk, categories);
  }

  // Telegram opt-in (optional, independent of web push)
  if (body.telegram === true || Array.isArray(body.telegramCategories)) {
    const tgCats = sanitizeCategories(body.telegramCategories);
    await setTelegramNotify(me.tid, tgCats);
  }

  const state = await getMemberNotifState(me.tid);
  return NextResponse.json({ ok: true, web: state.web, telegram: state.telegram });
}

export async function DELETE(req: Request) {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json({ ok: false, error: "Sign in first" }, { status: 401 });
  }
  let body: { endpoint?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.endpoint === "string" && body.endpoint) {
    await deletePushSub(body.endpoint);
  }
  return NextResponse.json({ ok: true });
}
