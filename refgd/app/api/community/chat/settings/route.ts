import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { setModConfig } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST → community-admin toggle for hiding the public member count. */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me || !me.admin) {
    return NextResponse.json(
      { ok: false, error: "Admins only" },
      { status: 403 },
    );
  }

  let payload: { hideMembers?: unknown };
  try {
    payload = (await req.json()) as { hideMembers?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  if (typeof payload.hideMembers !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "hideMembers must be a boolean" },
      { status: 400 },
    );
  }

  await setModConfig("chat_hide_members", payload.hideMembers);
  return NextResponse.json({ ok: true, hideMembers: payload.hideMembers });
}
