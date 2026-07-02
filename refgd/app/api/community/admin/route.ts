import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  listInviteLinks,
  createInviteLink,
  deleteInviteLink,
  inviteLinkExists,
  listRecentActions,
  isValidInviteSlug,
  recordAction,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin console API for /community. Every method is gated on the member
 * session's `admin` flag (resolved server-side from COMMUNITY_ADMIN_TG_IDS),
 * so a non-admin can never read the actions log or mint invites.
 *
 * GET    — invite links (with click/join tracking) + the 3-day actions log.
 * POST   — create an invite link { slug, name }.
 * DELETE — remove an invite link { slug }.
 */
export async function GET() {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  const [invites, actions] = await Promise.all([
    listInviteLinks(),
    listRecentActions(200),
  ]);
  return NextResponse.json({ ok: true, invites, actions });
}

export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  let body: { slug?: unknown; name?: unknown };
  try {
    body = (await req.json()) as { slug?: unknown; name?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const slug =
    typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!isValidInviteSlug(slug)) {
    return NextResponse.json(
      { ok: false, error: "Slug must be 1–64 chars of a–z, 0–9, - or _" },
      { status: 400 },
    );
  }
  if (await inviteLinkExists(slug)) {
    return NextResponse.json(
      { ok: false, error: "That link already exists" },
      { status: 409 },
    );
  }
  const invite = await createInviteLink(slug, name || slug, me.tid);
  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "Couldn't create the link" },
      { status: 500 },
    );
  }
  await recordAction({
    actorTgId: me.tid,
    actorName: me.name,
    action: "invite_created",
    target: slug,
  }).catch(() => undefined);
  return NextResponse.json({ ok: true, invite });
}

export async function DELETE(req: Request) {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  let body: { slug?: unknown };
  try {
    body = (await req.json()) as { slug?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const slug =
    typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!isValidInviteSlug(slug)) {
    return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
  }
  const removed = await deleteInviteLink(slug);
  if (removed) {
    await recordAction({
      actorTgId: me.tid,
      actorName: me.name,
      action: "invite_deleted",
      target: slug,
    }).catch(() => undefined);
  }
  return NextResponse.json({ ok: removed });
}
