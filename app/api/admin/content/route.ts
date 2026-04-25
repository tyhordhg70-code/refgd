import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { listContentBlocks, setContentBlock } from "@/lib/content";

export const dynamic = "force-dynamic";

async function requireAuth(): Promise<NextResponse | null> {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET() {
  const u = await requireAuth();
  if (u) return u;
  return NextResponse.json({ blocks: listContentBlocks() });
}

export async function PUT(req: Request) {
  const u = await requireAuth();
  if (u) return u;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.blocks)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  for (const b of body.blocks as Array<{ id: string; value: string }>) {
    if (typeof b.id === "string" && typeof b.value === "string") {
      setContentBlock(b.id, b.value);
    }
  }
  return NextResponse.json({ ok: true, blocks: listContentBlocks() });
}
