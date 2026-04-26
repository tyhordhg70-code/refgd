import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Lightweight client-side check: is the visitor an authenticated admin?
 * Used by the inline editor to decide whether to render the floating
 * toolbar and editable overlays. Returns no PII, just a boolean.
 */
export async function GET() {
  const s = await readSession();
  return NextResponse.json({ admin: Boolean(s), username: s?.username ?? null });
}
