import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { clearLinkPreview, getMessageEditInfo } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/community/chat/link-preview — remove a sent message's preview
 * card (Telegram's "remove preview", after the fact).
 *
 * One-way by design: the card is dropped, never re-scraped. Bringing it back
 * would mean re-fetching an arbitrary URL on demand, which turns this route
 * into a request-a-fetch endpoint — the composer's ✕ is where you decide.
 * A member may clear their OWN message; an admin may clear any.
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "Sign in with Telegram" },
      { status: 401 },
    );
  }

  let payload: { id?: unknown };
  try {
    payload = (await req.json()) as { id?: unknown };
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

  const info = await getMessageEditInfo(id);
  if (!info || info.deleted) {
    return NextResponse.json(
      { ok: false, error: "Message not found" },
      { status: 404 },
    );
  }
  if (!me.admin && info.tgId !== me.tid) {
    return NextResponse.json(
      { ok: false, error: "You can only change your own messages" },
      { status: 403 },
    );
  }

  await clearLinkPreview(id);
  return NextResponse.json({ ok: true });
}
