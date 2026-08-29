/**
 * Server-side Open Graph / meta-tag scraper for link previews in chat
 * messages. Called from the chat POST route; the resulting JSONB is stored in
 * chat_messages.link_preview so every subsequent read carries the card data.
 *
 * SECURITY — this fetches USER-SUPPLIED URLs from the server, which is the
 * same SSRF surface as /api/img, and it mirrors that route's guard model
 * exactly (see app/api/img/route.ts for the incident history behind each
 * rule):
 *   - http/https only; hosts must resolve to PUBLIC addresses. The
 *     pre-connect `hostIsSafe` check is backed by a connect-time pin via a
 *     custom `lookup` (the real DNS-rebinding / TOCTOU gate). The lookup
 *     honors `options.all` — Node ≥20 happy-eyeballs calls it with all:true
 *     and REQUIRES the array callback form; the legacy 3-arg form makes every
 *     connect fail silently.
 *   - Redirects are followed MANUALLY (max 3 hops), re-running the protocol
 *     and host checks on every hop, so a public URL can't 30x-bounce the
 *     server into the private network / cloud metadata.
 *   - The body is STREAMED with a hard byte cap under one absolute deadline
 *     that covers connect + headers + body — never arrayBuffer() a stranger's
 *     response on a 512 MB instance.
 */
import http from "node:http";
import https from "node:https";
import net from "node:net";
import dnsCb from "node:dns";
import dns from "node:dns/promises";
import type { IncomingMessage } from "node:http";
import { linkTokenRe } from "./link-token";

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

/**
 * Default end-to-end budget (connect + headers + body across all hops). The
 * chat route races the send against a shorter ceiling and lets the remainder
 * attach late via updateLinkPreview, so this may exceed the send budget.
 */
const TIMEOUT_MS = 8_000;
/** Meta tags live in <head> — cap the read there. */
const MAX_HTML_BYTES = 80_000;
const MAX_REDIRECTS = 3;

/**
 * Return the first HTTP(S) URL found in a message body.
 * Checks `[label](url)` text-link tokens first (from spliceEntityTokens),
 * then falls back to raw URL patterns.
 */
export function extractFirstUrl(body: string): string | null {
  const tokenMatch = linkTokenRe().exec(body);
  if (tokenMatch) return tokenMatch[2].trim();
  const rawMatch = /(https?:\/\/[^\s<>"'[\]]+)/.exec(body);
  return rawMatch ? rawMatch[1].replace(/[.,;:!?)]+$/, "") : null;
}

/**
 * Single-pass HTML entity decode for meta-tag text (single pass so
 * "&amp;lt;" decodes to "&lt;", never double-decodes to "<").
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, ent: string) => {
    const lower = ent.toLowerCase();
    if (lower[0] === "#") {
      const cp =
        lower[1] === "x" ? parseInt(lower.slice(2), 16) : Number(lower.slice(1));
      const valid =
        Number.isFinite(cp) &&
        cp > 0 &&
        cp <= 0x10ffff &&
        !(cp >= 0xd800 && cp <= 0xdfff);
      return valid ? String.fromCodePoint(cp) : whole;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower)
      ? NAMED_ENTITIES[lower]
      : whole;
  });
}

/** IPv4 private/reserved check on a dotted-quad string. */
function isBlockedIpV4(ip: string): boolean {
  const o = ip.split(".").map(Number);
  if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return true;
  const [a, b, c] = o;
  if (a === 0 || a === 10 || a === 127) return true; // this-net, private, loopback
  if (a === 169 && b === 254) return true; // link-local (incl. metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  // Only the named /24 documentation blocks — see /api/img for why the
  // surrounding /16s must stay allowed (Automattic CDN lives there).
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking /15
  if (a === 198 && b === 51 && c === 100) return true; // test-net
  if (a === 203 && b === 0 && c === 113) return true; // test-net
  if (a >= 224) return true; // multicast + reserved
  return false;
}

/**
 * Expand an IPv6 literal into its 8 numeric groups (zone index stripped,
 * embedded dotted-IPv4 tail folded into the last two groups). Null when the
 * text can't be parsed — callers must treat null as blocked.
 */
function expandIpv6(ip: string): number[] | null {
  const zone = ip.indexOf("%");
  if (zone !== -1) ip = ip.slice(0, zone);
  const v4 = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (v4) {
    const o = v4[2].split(".").map(Number);
    if (o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    ip =
      v4[1] +
      ((o[0] << 8) | o[1]).toString(16) +
      ":" +
      ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
  } else if (head.length + tail.length > 7) {
    return null; // "::" must stand for at least one zero group
  }
  const groups = [
    ...head,
    ...Array(8 - head.length - tail.length).fill("0"),
    ...tail,
  ];
  const nums = groups.map((g) =>
    /^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16) : NaN,
  );
  return nums.some(Number.isNaN) ? null : nums;
}

/** True for loopback / private / link-local / reserved / CGNAT / multicast. */
function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIpV4(ip);

  if (net.isIPv6(ip)) {
    const g = expandIpv6(ip);
    if (!g) return true; // unparseable -> block
    // Any address embedding an IPv4 is judged AS that IPv4 — catches
    // ::ffff:7f00:1 (mapped, hex form), ::ffff:127.0.0.1 (mapped, dotted),
    // ::127.0.0.1 (v4-compatible, incl. ::/::1 which fold to 0.0.0.x) and
    // 64:ff9b::7f00:1 (NAT64) — forms that string-prefix checks miss.
    const embedsV4 =
      (g[0] === 0 &&
        g[1] === 0 &&
        g[2] === 0 &&
        g[3] === 0 &&
        g[4] === 0 &&
        (g[5] === 0xffff || g[5] === 0)) ||
      (g[0] === 0x64 &&
        g[1] === 0xff9b &&
        g[2] === 0 &&
        g[3] === 0 &&
        g[4] === 0 &&
        g[5] === 0);
    if (embedsV4) {
      return isBlockedIpV4(
        `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`,
      );
    }
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    return false;
  }

  return true; // unknown form -> block
}

async function hostIsSafe(hostname: string): Promise<boolean> {
  // URL.hostname keeps IPv6 literals bracketed — strip for the IP check.
  const bare =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  if (net.isIP(bare)) return !isBlockedIp(bare);
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
 * Connect-time DNS validation (the real SSRF gate — hostIsSafe alone leaves
 * the rebinding TOCTOU window open). Honors `options.all` per the Node ≥20
 * requirement documented at the top of the file.
 */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  const family = typeof options === "number" ? options : (options?.family ?? 0);
  const wantAll =
    typeof options === "object" && options !== null && options.all === true;
  dnsCb.lookup(
    hostname,
    {
      all: true,
      family,
      hints: typeof options === "object" ? options?.hints : undefined,
    },
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
 * Single GET over node:http(s) with the validating lookup, killed outright at
 * `timeoutMs` (absolute — a slow-drip header phase can't outlive it).
 */
function requestOnce(u: URL, timeoutMs: number): Promise<IncomingMessage> {
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
          // The OG-bot UA gets meta-only responses from most large sites.
          "User-Agent": "facebookexternalhit/1.1",
          Accept: "text/html,application/xhtml+xml",
          // No gzip: the byte cap must count real HTML bytes.
          "Accept-Encoding": "identity",
        },
        lookup: safeLookup,
        timeout: Math.max(1, timeoutMs), // idle guard
      },
      (res) => {
        clearTimeout(killer);
        resolve(res);
      },
    );
    const killer = setTimeout(
      () => req.destroy(new Error("deadline")),
      Math.max(1, timeoutMs),
    );
    req.on("error", (e) => {
      clearTimeout(killer);
      reject(e);
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.end();
  });
}

/**
 * Stream up to `cap` bytes, stopping at the absolute `deadline`. Resolves
 * with whatever arrived (partial <head> usually still carries the metas);
 * null only when nothing usable arrived.
 */
function readCapped(
  res: IncomingMessage,
  cap: number,
  deadline: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      res.destroy(); // stop pulling bytes — we have what we need
      resolve(total > 0 ? Buffer.concat(chunks).toString("utf8") : null);
    };
    const timer = setTimeout(finish, Math.max(1, deadline - Date.now()));
    res.on("data", (c: Buffer) => {
      total += c.length;
      chunks.push(c);
      if (total >= cap) finish();
    });
    res.on("end", finish);
    res.on("error", finish);
  });
}

/**
 * Resolve a possibly-relative OG image URL against the page's URL.
 * Returns null unless the RESOLVED result is http(s) — a hostile page can
 * otherwise smuggle javascript:/data: straight into the card's <img src>.
 */
function resolveImage(raw: string, pageUrl: string): string | null {
  if (!raw) return null;
  try {
    const u = raw.startsWith("//")
      ? new URL(`https:${raw}`)
      : /^[a-z][a-z0-9+.-]*:/i.test(raw)
        ? new URL(raw)
        : new URL(raw, new URL(pageUrl));
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Fetch Open Graph / meta data from `url` under one absolute deadline.
 * Returns null on any blocked host, network error, timeout, or missing
 * useful content. Never throws.
 */
export async function fetchLinkPreview(
  url: string,
  timeoutMs = TIMEOUT_MS,
): Promise<LinkPreview | null> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return null;

  const deadline = Date.now() + timeoutMs;
  let html: string | null = null;
  try {
    if (!(await hostIsSafe(target.hostname))) return null;

    // Manual redirect walk — every hop re-validates protocol + host, and the
    // connection itself re-validates the resolved IP via safeLookup.
    let current = target;
    let upstream: IncomingMessage | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const left = deadline - Date.now();
      if (left <= 0) return null;
      const resp = await requestOnce(current, left);
      const status = resp.statusCode ?? 0;

      if (status >= 300 && status < 400) {
        const loc = resp.headers.location;
        // Kill the redirect body outright — only Location matters. resume()
        // would let a hostile endpoint drip bytes and hold the socket open
        // past the deadline (each send could leak a long-lived socket).
        resp.destroy();
        if (!loc) return null;
        let next: URL;
        try {
          next = new URL(loc, current);
        } catch {
          return null;
        }
        if (next.protocol !== "http:" && next.protocol !== "https:")
          return null;
        if (!(await hostIsSafe(next.hostname))) return null;
        current = next;
        continue;
      }

      upstream = resp;
      break;
    }
    if (!upstream) return null;

    const status = upstream.statusCode ?? 0;
    const ct = (upstream.headers["content-type"] as string | undefined) ?? "";
    if (status < 200 || status >= 300 || !ct.includes("html")) {
      upstream.destroy();
      return null;
    }
    html = await readCapped(upstream, MAX_HTML_BYTES, deadline);
  } catch {
    return null;
  }
  if (!html) return null;
  const doc = html;

  /** Extract a <meta> tag by property or name, either attribute order. */
  const getMeta = (key: string): string | null => {
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${esc}["']`,
        "i",
      ),
    ];
    for (const p of patterns) {
      const m = p.exec(doc);
      if (m) return decodeEntities(m[1].trim());
    }
    return null;
  };

  const title =
    getMeta("og:title") ??
    getMeta("twitter:title") ??
    (() => {
      const m = /<title[^>]*>([^<]{1,200})<\/title>/i.exec(doc);
      return m ? decodeEntities(m[1].replace(/\s+/g, " ").trim()) : null;
    })();

  const description =
    getMeta("og:description") ??
    getMeta("twitter:description") ??
    getMeta("description");

  const rawImage = getMeta("og:image") ?? getMeta("twitter:image");
  const image = rawImage ? resolveImage(rawImage, url) : null;
  const siteName = getMeta("og:site_name");

  if (!title && !description) return null;

  return {
    url,
    title: title ?? undefined,
    description: description?.slice(0, 250) ?? undefined,
    image: image ?? undefined,
    siteName: siteName ?? undefined,
  };
}
