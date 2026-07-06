import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { deleteVouch, recordAction } from "@/lib/community";
import { setContentBlock } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/community/vouch/delete — admin-only delete of a read-only history
 * post (Client Testimonials, BUY4U Vouches, Announcements) or a constant seed
 * bubble. Vouch rows are hard-deleted (media + reactions cascade manually);
 * seed bubbles have no row, so "deleting" one persists a hidden flag in
 * content_blocks (community_seed_hidden:<slot>) that the page reads back.
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json(
      { ok: false, error: "Admins only" },
      { status: 403 },
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

  const rawId =
    typeof payload.id === "string" || typeof payload.id === "number"
      ? String(payload.id)
      : "";
  const seedMatch = /^seed:(readme|welcome|announcement|chat-notice)$/.exec(
    rawId,
  );
  const id = /^\d+$/.test(rawId) || seedMatch ? rawId : null;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing post id" },
      { status: 400 },
    );
  }

  if (seedMatch) {
    await setContentBlock(`community_seed_hidden:${seedMatch[1]}`, "1");
  } else {
    const deleted = await deleteVouch(id);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "Post not found" },
        { status: 404 },
      );
    }
  }

  await recordAction({
    actorTgId: me.tid,
    actorName: me.name,
    action: "delete-vouch",
    target: id,
    meta: { id },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, id });
}
