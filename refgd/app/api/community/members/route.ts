import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { listMembers } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET → the member roster (display name + numeric Telegram ID + mod state).
 *
 * ADMIN ONLY. The chat exposes no @usernames, so admins moderate members by
 * their numeric tg_id; this endpoint surfaces those ids so an admin can copy
 * one and run e.g. `/ban 923182`. Because it leaks members' Telegram IDs it is
 * gated SERVER-SIDE on the admin session — never rely on the client hiding it.
 */
export async function GET() {
  const me = await readMemberSession();
  if (!me?.admin) {
    return NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
  }
  const members = await listMembers();
  return NextResponse.json({ ok: true, members });
}
