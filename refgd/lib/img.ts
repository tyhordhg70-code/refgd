/**
 * Logo image helpers for the store-list cards.
 *
 * Store logos render inside a 56px box but are admin-pasted from ~40 different
 * third-party hosts, many of them oversized (e.g. a 3840px Wikimedia PNG ≈
 * 268KB) and none of them cached by us. On a list of hundreds of cards that
 * reads as "the giftcard images don't load". Two in-house levers fix it with
 * no server-side image processing and no new dependency:
 *
 *   1. normalizeLogoUrl — shrink oversized Wikimedia *thumbnail* URLs. Those
 *      URLs encode the rendered width as `/<N>px-…`, so we can rewrite an
 *      oversized N down to 256 with no visible quality loss at a 56px display
 *      and a ~10-20× smaller download.
 *
 *   2. cachedSrc — route arbitrary admin-pasted hosts through the server-side
 *      cache proxy (`/api/img`) so they gain long-lived browser/CDN caching
 *      AND survive hosts that block cross-origin hot-linking (the proxy fetches
 *      server-side with no browser Referer). Known hot-linkable CDNs (Wikimedia
 *      media host, Google/gstatic favicons, DuckDuckGo, Clearbit) load DIRECT —
 *      they already ship cache headers + a global edge, so funnelling them
 *      through our single Render instance would only add a hop.
 *
 * Deterministic on server & client (no `window`) to avoid hydration mismatch.
 */

const DIRECT_IMG_HOSTS = new Set([
  "upload.wikimedia.org",
  "www.google.com",
  "google.com",
  "icons.duckduckgo.com",
  "logo.clearbit.com",
]);

function isDirectImgHost(host: string): boolean {
  const h = host.toLowerCase();
  return DIRECT_IMG_HOSTS.has(h) || h.endsWith(".gstatic.com");
}

/** Logos display in a 56px box; 256px keeps them crisp on 3-4× retina. */
const MAX_LOGO_PX = 256;

/**
 * Rewrite an oversized Wikimedia thumbnail width down to MAX_LOGO_PX.
 * No-op for non-Wikimedia URLs, non-thumbnail (original-file) Wikimedia URLs,
 * data/blob/relative URLs, and widths already at or below MAX_LOGO_PX.
 */
export function normalizeLogoUrl(u: string): string {
  if (!u || !/^https?:\/\//i.test(u)) return u;
  try {
    const url = new URL(u);
    if (url.hostname === "upload.wikimedia.org" && url.pathname.includes("/thumb/")) {
      // Only rewrite the TERMINAL thumbnail segment (`…/<N>px-<filename>`) so a
      // rare original filename that itself begins with `<N>px-` earlier in the
      // path can never be corrupted.
      url.pathname = url.pathname.replace(/\/(\d{2,})px-([^/]*)$/, (m, n, rest) =>
        Number(n) > MAX_LOGO_PX ? `/${MAX_LOGO_PX}px-${rest}` : m,
      );
      return url.toString();
    }
  } catch {
    /* malformed URL → leave untouched */
  }
  return u;
}

/**
 * Resolve the actual <img src> for a logo candidate: normalize the size, then
 * either load it direct (known CDN hosts) or via the cache proxy (everything
 * else). Left untouched: data:/blob:/relative URLs and anything already
 * pointing at one of our own image routes.
 */
export function cachedSrc(u: string): string {
  if (!u || !/^https?:\/\//i.test(u)) return u;
  if (/^https?:\/\/[^/]+\/(api\/img|gc-img|_next)/i.test(u)) return u;
  const normalized = normalizeLogoUrl(u);
  try {
    if (isDirectImgHost(new URL(normalized).hostname)) return normalized;
  } catch {
    /* malformed URL → fall through to the proxy */
  }
  return `/api/img?u=${encodeURIComponent(normalized)}`;
}

/**
 * Resolve the <img src> for a Telegram profile photo (community chat avatars).
 *
 * Stored `photo_url`s hotlink `https://t.me/i/userpic/...`, which breaks two
 * ways: `t.me` does not even RESOLVE on many datacenter/carrier DNS servers
 * (verified: NXDOMAIN from both this environment and Render — the deployed
 * proxy 400s it at the host check), and mobile networks/webviews block it
 * outright, which is why avatars showed as letters on phones.
 * `telegram.me` is Telegram's own alias serving byte-identical userpics and
 * resolves everywhere, so:
 *   1. swap the host t.me → telegram.me, then
 *   2. route through `/api/img` for same-origin delivery + long-lived caching
 *      (a userpic URL's hash changes when the photo changes, so immutable
 *      caching is safe). Video avatars hotlink directly — the proxy is
 *      image/* only and would just 302 them anyway.
 * Local paths (e.g. /rose-bot-photo.jpg, /gc-img/…) pass through untouched.
 */
export function avatarSrc(u: string): string {
  if (!u || !/^https?:\/\//i.test(u)) return u;
  const swapped = u.replace(/^https:\/\/(?:t|telegram)\.me\//i, "https://telegram.me/");
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(swapped)) return swapped;
  return `/api/img?u=${encodeURIComponent(swapped)}`;
}
