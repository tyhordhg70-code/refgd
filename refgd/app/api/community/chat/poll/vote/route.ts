import { NextResponse } from "next/server";
import { readMemberSession } from "@/lib/community-auth";
import {
  votePoll,
  closePoll,
  getChatMemberModState,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST → cast/replace the signed-in member's vote on a poll.
 * `{ pollId, optionIdxs: number[] }` — an empty array retracts the vote.
 * `{ pollId, close: true }` closes the poll (creator or admin only).
 */
export async function POST(req: Request) {
  const me = await readMemberSession();
  if (!me) {
    return NextResponse.json(
      { ok: false, error: "Sign in with Telegram to vote" },
      { status: 401 },
    );
  }

  let payload: { pollId?: unknown; optionIdxs?: unknown; close?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const pollId =
    (typeof payload.pollId === "string" || typeof payload.pollId === "number") &&
    /^\d+$/.test(String(payload.pollId))
      ? String(payload.pollId)
      : null;
  if (!pollId) {
    return NextResponse.json(
      { ok: false, error: "Invalid poll" },
      { status: 400 },
    );
  }

  const mod = await getChatMemberModState(me.tid);
  if (mod.isBanned) {
    return NextResponse.json(
      { ok: false, error: "You are banned from the chat" },
      { status: 403 },
    );
  }

  if (payload.close === true) {
    const done = await closePoll(pollId, me.tid, me.admin);
    return done
      ? NextResponse.json({ ok: true })
      : NextResponse.json(
          { ok: false, error: "Only the poll creator can close it" },
          { status: 403 },
        );
  }

  const idxsRaw = Array.isArray(payload.optionIdxs) ? payload.optionIdxs : [];
  const optionIdxs = idxsRaw
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    .slice(0, 10);

  const result = await votePoll({ pollId, tgId: me.tid, optionIdxs });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
