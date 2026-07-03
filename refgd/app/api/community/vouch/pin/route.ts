import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { setVouchPinned, recordAction } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/community/vouch/pin — admin-only pin/unpin of a read-only history
 * post (Client Testimonials, BUY4U Vouches, Announcements). Migrated history
 * bubbles have no live message id, so pinning is persisted on the vouches row
 * instead (parity with the chat menu's admin pin). The resulting pin state is
 * echoed back so the client can patch its view without a full refetch.
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json(
      { ok: false, error: "Admins only" },
      { status: 403 },
    );
  }

  let payload: { id?: unknown; pinned?: unknown };
  try {
    payload = (await req.json()) as { id?: unknown; pinned?: unknown };
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

  if (typeof payload.pinned !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Missing pin state" },
      { status: 400 },
    );
  }
  const pinned = payload.pinned;

  const updated = await setVouchPinned(id, pinned);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Post not found" },
      { status: 404 },
    );
  }

  await recordAction({
    actorTgId: me.tid,
    actorName: me.name,
    action: pinned ? "pin-vouch" : "unpin-vouch",
    target: id,
    meta: { id },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, id, pinned });
}
