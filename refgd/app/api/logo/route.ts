import { NextResponse } from "next/server";
import { logoFallbackChain } from "@/lib/logo";

export const dynamic = "force-dynamic";

/**
 * Server-side logo resolver. Tries Clearbit first, falls back to DDG, then
 * Google. Returns the first URL that responds with an image content-type.
 *
 * The frontend can use this to verify a logo *exists* before saving an
 * override. For rendering, the StoreCard component uses the URL list directly
 * with onError fallback (no proxy needed).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const domain = (url.searchParams.get("domain") || "").trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}/.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }
  const candidates = logoFallbackChain(domain);
  for (const candidate of candidates) {
    try {
      const r = await fetch(candidate, { method: "GET", cache: "no-store" });
      if (r.ok) {
        const ct = r.headers.get("content-type") || "";
        if (ct.startsWith("image/")) {
          return NextResponse.json({ url: candidate, contentType: ct });
        }
      }
    } catch {
      // try next
    }
  }
  // Last resort — return first URL anyway so the client can attempt
  return NextResponse.json({ url: candidates[0], contentType: null, fallback: true });
}
