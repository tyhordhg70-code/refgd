import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import dnsCb from "node:dns";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import type { IncomingMessage } from "node:http";

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
const MAX_REDIRECTS = 3;

/** True for loopback / private / link-local / reserved / CGNAT / multicast. */
function isBlockedIp(ip: string): boolean {
  // Normalise IPv4-mapped IPv6 (::ffff:1.2.3.4) down to the IPv4 form.
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) ip = mapped[1];

  if (net.isIPv4(ip)) {
    const o = ip.split(".").map(Number);
    if (o.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b, c] = o;
    if (a === 0 || a === 10 || a === 127) return true; // this-net, private, loopback
    if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    // Documentation / test-net blocks below are ONLY the named /24s. The
    // previous checks dropped the third octet and so blocked the entire
    // surrounding /16, wrongly rejecting legitimate PUBLIC space — most
    // notably Automattic's 192.0.64.0/18 CDN (i*.wp.com, hosts on 192.0.66 /
    // 192.0.77), which made admin-pasted images on those hosts 400 here.
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24 + 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking 198.18.0.0/15
    if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 test
    if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 test
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

/**
 * Custom DNS lookup used for the OUTBOUND connection. This is the real SSRF
 * gate: `hostIsSafe()` above runs before we connect, but a hostile authority
 * can return a public IP to that check and a private IP to the socket's own
 * resolution milliseconds later (DNS rebinding / TOCTOU). Because Node calls
 * this function at *connect time* and connects to exactly the address we hand
 * back, validating here pins the connection to a vetted IP. We resolve every
 * candidate, reject if ANY is private/reserved, and otherwise return the first.
 * SNI/Host stay the original hostname, so TLS still validates normally.
 */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  const family =
    typeof options === "number" ? options : options?.family ?? 0;
  // Node ≥20 (autoSelectFamily / happy-eyeballs) calls this lookup with
  // `options.all === true` and REQUIRES the callback's second argument to be
  // the LookupAddress ARRAY form. Answering with the legacy 3-arg
  // (address, family) form there makes every connect fail with
  // "Invalid IP address: undefined" — which silently 302-fell-back ALL
  // proxied images in production. Honor whichever form the caller asked for.
  const wantAll = typeof options === "object" && options !== null && options.all === true;
  dnsCb.lookup(
    hostname,
    { all: true, family, hints: typeof options === "object" ? options?.hints : undefined },
    (err, addresses) => {
      if (err) {
        callback(err, "", 4);
        return;
      }
      const list = Array.isArray(addresses) ? addresses : [];
      if (!list.length || list.some((r) => isBlockedIp(r.address))) {
        callback(new Error("blocked address"), "", 4);
        return;
      }
      if (wantAll) {
        callback(null, list);
        return;
      }
      const chosen = list[0];
      callback(null, chosen.address, chosen.family);
    },
  );
};

/**
 * Single GET over node:http(s) with the validating lookup above. Returns the
 * live IncomingMessage (caller drains or streams it). Rejects on socket error
 * or timeout — the caller turns any rejection into the safe 302 fallback.
 */
function requestOnce(u: URL): Promise<IncomingMessage> {
  const mod = u.protocol === "https:" ? https : http;
  return new Promise<IncomingMessage>((resolve, reject) => {
    const req = mod.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method: "GET",
        headers: {
          Host: u.host,
          "User-Agent": "Mozilla/5.0",
          Accept: "image/*,*/*",
          // We forward bytes verbatim (no decompression), so make the
          // no-compression assumption explicit and never receive gzip.
          "Accept-Encoding": "identity",
        },
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
      },
      resolve,
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.end();
  });
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
    // Follow redirects MANUALLY so each hop's host is re-validated before we
    // connect. With an auto-following client a public URL could 30x-bounce the
    // server into the private network / cloud metadata AFTER the initial host
    // check passed — a classic SSRF gap. We resolve each Location, re-run the
    // protocol + host checks, and bail to the safe "load it directly" 302 on
    // any blocked or malformed redirect. The actual connection additionally
    // re-validates the resolved IP at connect time (safeLookup), closing the
    // DNS-rebinding window that a pre-connect host check alone leaves open.
    let current = target;
    let upstream: IncomingMessage | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const resp = await requestOnce(current);
      const status = resp.statusCode ?? 0;

      if (status >= 300 && status < 400) {
        const loc = resp.headers.location;
        resp.resume(); // drain the redirect body so the socket frees up
        if (!loc) break; // malformed redirect -> fall through to direct fallback
        let next: URL;
        try {
          next = new URL(loc, current); // resolve relative Location values
        } catch {
          return NextResponse.redirect(target.toString(), 302);
        }
        if (next.protocol !== "http:" && next.protocol !== "https:") {
          return NextResponse.redirect(target.toString(), 302);
        }
        if (!(await hostIsSafe(next.hostname))) {
          return NextResponse.redirect(target.toString(), 302);
        }
        current = next;
        continue;
      }

      upstream = resp;
      break;
    }

    // Redirect chain never resolved to a final response (too many hops or a
    // bodyless redirect) -> behave no worse than loading the original directly.
    if (!upstream) {
      return NextResponse.redirect(target.toString(), 302);
    }

    const status = upstream.statusCode ?? 0;
    const ct = (upstream.headers["content-type"] as string | undefined) || "";
    const clHeader = Number(upstream.headers["content-length"] || "0");
    if (status < 200 || status >= 300 || !ct.startsWith("image/") || clHeader > MAX_BYTES) {
      upstream.resume(); // discard the body we won't forward
      return NextResponse.redirect(target.toString(), 302);
    }

    // Buffer with a HARD cap enforced as we read: Content-Length is advisory
    // (absent on chunked responses, and a hostile host could lie), so we count
    // real bytes and bail the moment we cross the limit.
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of upstream) {
      const buf = chunk as Buffer;
      total += buf.length;
      if (total > MAX_BYTES) {
        upstream.destroy();
        return NextResponse.redirect(target.toString(), 302);
      }
      chunks.push(buf);
    }
    const body = new Uint8Array(Buffer.concat(chunks, total));

    const headers = new Headers({
      "Content-Type": ct,
      // Browser: cache effectively forever (image URLs are stable).
      // CDN: 7 days, serve stale while revalidating.
      "Cache-Control":
        "public, max-age=31536000, immutable, s-maxage=604800, stale-while-revalidate=86400",
      "Content-Length": String(body.byteLength),
      // Hardening for SVG (avatars flow through here): never let a direct
      // navigation to /api/img?u=<hostile-svg> run scripts same-origin, and
      // never let the browser sniff a different type than we forward.
      "Content-Security-Policy": "sandbox",
      "X-Content-Type-Options": "nosniff",
    });
    const etag = upstream.headers.etag;
    if (etag) headers.set("ETag", Array.isArray(etag) ? etag[0] : etag);

    return new NextResponse(body, { status: 200, headers });
  } catch {
    return NextResponse.redirect(target.toString(), 302);
  }
}
