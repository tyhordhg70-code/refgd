import { NextResponse } from "next/server";
import { verifyCredentials, createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const ok = await verifyCredentials(body.username, body.password);
  if (!ok) {
    // small delay to slow brute force
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  await createSession(body.username);
  return NextResponse.json({ ok: true });
}
