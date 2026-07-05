import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  pingTyping,
  clearTyping,
  isChatTopic,
  type ChatTopic,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST → refresh (or stop) the signed-in member's "typing…" heartbeat for a
 * topic. The client throttles pings to ~3s while the composer has text; the
 * chat GET surfaces fresh rows (< 6s old) as `typing: string[]` on every
 * 2.5s short-poll, which is what makes the header indicator feel live.
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  let payload: { topic?: unknown; stop?: unknown };
  try {
    payload = (await req.json()) as { topic?: unknown; stop?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const topic: ChatTopic = isChatTopic(payload.topic) ? payload.topic : "chat";

  try {
    if (payload.stop === true) {
      await clearTyping(topic, me.tid);
    } else {
      await pingTyping(topic, me.tid, me.name);
    }
  } catch {
    // Presence is best-effort — never surface an error for a heartbeat.
  }
  return NextResponse.json({ ok: true });
}
