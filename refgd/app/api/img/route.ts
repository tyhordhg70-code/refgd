import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

/**
 * Generic cached image proxy.
 *
 * Used by <EditableImage> for every remote (admin-pasted) image on the
 * public render path. Two wins:
 *   1. Caching — we attach a long, immutable Cache-Control so the browser
 *      and any CDN in front of Render keep the bytes instead of re-fetching
 *      the original host on every page view (attraction / brand photos).
 *   2. Hot-link fixes — the fetch happens server-side with no browser
 *      Referer, so hosts that block cross-origin hot-linking (which show as
 *      "broken image" in the browser) load fine through here.
 *
 * On any failure (bad URL, blocked host, upstream error, non-image
 * response) we 302 to the original URL so behaviour never regresses below
 * "load it directly".
 *
 * SSRF hardening: the endpoint is publicly callable, so before fetching we
 * resolve the host and refuse any private / loopback / link-local /
 * reserved address (blocks internal-network probing and cloud metadata),
 * cap the response size, and time the request out.
 */

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const TIMEOUT_MS = 10_000;

/** True for loopback / private / link-local / reserved / CGNAT / multicast. */
function isBlockedIp(ip: string): boolean {
  // Normalise IPv4-mapped IPv6 (::ffff:1.2.3.4) down to the IPv4 form.
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) ip = mapped[1];

  if (net.isIPv4(ip)) {
    const o = ip.split(".").map(Number);
    if (o.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = o;
    if (a === 0 || a === 10 || a === 127) return true; // this-net, private, loopback
    if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24 (special/test)
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a === 198 && b === 51) return true; // 198.51.100.0/24 test
    if (a === 203 && b === 0) return true; // 203.0.113.0/24 test
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const lc = ip.toLowerCase();
    if (lc === "::" || lc === "::1") return true; // unspecified, loopback
    if (lc.startsWith("fe8") || lc.startsWith("fe9") || lc.startsWith("fea") || lc.startsWith("feb"))
      return true; // fe80::/10 link-local
    if (lc.startsWith("fc") || lc.startsWith("fd")) return true; // fc00::/7 unique-local
    if (lc.startsWith("ff")) return true; // multicast
    return false;
  }

  return true; // unknown form -> block
}

async function hostIsSafe(hostname: string): Promise<boolean> {
  if (net.isIP(hostname)) return !isBlockedIp(hostname);
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records.length) return false;
    return records.every((r) => !isBlockedIp(r.address));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new NextResponse(null, { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new NextResponse(null, { status: 400 });
  }
  if (!(await hostIsSafe(target.hostname))) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*,*/*" },
      cache: "force-cache",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const ct = upstream.headers.get("content-type") || "";
    const cl = Number(upstream.headers.get("content-length") || "0");
    if (!upstream.ok || !upstream.body || !ct.startsWith("image/") || cl > MAX_BYTES) {
      // Let the browser try the original directly.
      return NextResponse.redirect(target.toString(), 302);
    }

    const headers = new Headers({
      "Content-Type": ct,
      // Browser: cache effectively forever (image URLs are stable).
      // CDN: 7 days, serve stale while revalidating.
      "Cache-Control":
        "public, max-age=31536000, immutable, s-maxage=604800, stale-while-revalidate=86400",
    });
    if (cl) headers.set("Content-Length", String(cl));
    const etag = upstream.headers.get("etag");
    if (etag) headers.set("ETag", etag);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.redirect(target.toString(), 302);
  }
}
