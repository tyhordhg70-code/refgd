import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { updateVouchBody, recordAction } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 2000;

/**
 * POST /api/community/vouch/edit — admin-only edit of a read-only history post
 * (Client Testimonials, BUY4U Vouches, Announcements). These bubbles are
 * migrated group history with no member author on this side, so only an admin
 * may rewrite them (parity with the chat menu's admin edit). The trimmed body
 * is echoed back so the client can patch its view without a full refetch.
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json(
      { ok: false, error: "Admins only" },
      { status: 403 },
    );
  }

  let payload: { id?: unknown; body?: unknown };
  try {
    payload = (await req.json()) as { id?: unknown; body?: unknown };
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
      { ok: false, error: "Missing post id" },
      { status: 400 },
    );
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Post is empty" },
      { status: 400 },
    );
  }
  if (body.length > MAX_BODY) {
    return NextResponse.json(
      { ok: false, error: "Post is too long" },
      { status: 400 },
    );
  }

  const updated = await updateVouchBody(id, body);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Post not found" },
      { status: 404 },
    );
  }

  await recordAction({
    actorTgId: me.tid,
    actorName: me.name,
    action: "edit-vouch",
    target: id,
    meta: { id },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, id, body });
}
