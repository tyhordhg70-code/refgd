import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { deleteStore, getStore, upsertStore } from "@/lib/stores";

export const dynamic = "force-dynamic";

async function requireAuth(): Promise<NextResponse | null> {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const u = await requireAuth();
  if (u) return u;
  const existing = getStore(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const merged = {
    ...existing,
    ...body,
    id: existing.id,
    createdAt: existing.createdAt,
  };
  if (Array.isArray(body.tags)) merged.tags = body.tags;
  const saved = upsertStore(merged);
  return NextResponse.json({ store: saved });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await requireAuth();
  if (u) return u;
  const existing = getStore(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  deleteStore(params.id);
  return NextResponse.json({ ok: true });
}
