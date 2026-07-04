import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import { isReactionTargetId, listReactionSummaries } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?ids=v12,seed:readme,… → reaction summaries for readonly targets
 * (imported vouch bubbles + constant seed posts). Session is optional: the
 * viewer just gets `mine:false` everywhere when signed out.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("ids") ?? "";
  const ids = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 40 && isReactionTargetId(s)),
    ),
  ).slice(0, 400);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, reactions: {} });
  }
  const me = await readMemberSession();
  const reactions = await listReactionSummaries(ids, me?.tid ?? null);
  return NextResponse.json({ ok: true, reactions });
}
