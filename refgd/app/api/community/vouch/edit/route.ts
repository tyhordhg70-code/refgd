import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { updateVouchBody, recordAction, setModConfig } from "@/lib/community";
import { setContentBlock } from "@/lib/content";

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

  const rawId =
    typeof payload.id === "string" || typeof payload.id === "number"
      ? String(payload.id)
      : "";
  // A numeric vouch id, or a constant "seed" bubble (READ ME / welcome /
  // announcement) which has no vouch row and persists elsewhere.
  const seedMatch = /^seed:(readme|welcome|announcement)$/.exec(rawId);
  const id = /^\d+$/.test(rawId) || seedMatch ? rawId : null;
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

  if (seedMatch) {
    // The welcome seed IS the group welcome banner (mod_config.welcome), which
    // also feeds the READ ME preview + search, so it must write there. The
    // readme/announcement seeds live in content_blocks (cache disabled, so
    // every Render worker sees the edit immediately).
    const slot = seedMatch[1];
    if (slot === "welcome") {
      await setModConfig("welcome", body);
    } else {
      await setContentBlock(`community_seed:${slot}`, body);
    }
  } else {
    const updated = await updateVouchBody(id, body);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Post not found" },
        { status: 404 },
      );
    }
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
