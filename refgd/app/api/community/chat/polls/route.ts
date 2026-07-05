import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { getPolls } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?ids=1,2,3 → batch-load poll questions/options/results for the poll
 * bubbles currently on screen. Reading is public (the chat is a window into
 * the group); `mine` flags need the signed-in member.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsRaw = url.searchParams.get("ids") ?? "";
  const ids = idsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .slice(0, 100);
  if (ids.length === 0) return NextResponse.json({ polls: {} });

  const me = await readMemberSession();
  const polls = await getPolls(ids, me?.tid ?? null);
  return NextResponse.json({ polls });
}
