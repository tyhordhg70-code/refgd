/* refgd — scene cache service worker.
 *
 * The home hero is a heavy (~23 MB) Spline galaxy: scene.splinecode. Its CDN
 * sends no Cache-Control header, so the browser's HTTP cache treats it
 * heuristically and tends to re-download the whole file on later visits.
 *
 * This worker persists that one file in the Cache Storage API (durable, large
 * quota) and serves it cache-first — transparently for BOTH the loading-screen
 * preloader AND Spline's own internal fetch of the same URL. Net effect: the
 * galaxy is downloaded ONCE and served locally on every future visit.
 *
 * Scope is deliberately tiny: ONLY *.splinecode on prod.spline.design is
 * intercepted. Every other request (HTML / JS / CSS / images / API) falls
 * straight through to the network, so this can never serve a stale deploy.
 *
 * NOTE: the cache name below must stay in sync with SCENE_CACHE in
 * lib/asset-preloader.ts (the preloader writes its download into this cache).
 */
const CACHE = "refgd-scene-v1";
const SCENE_HOST = "prod.spline.design";

// URLs already freshness-checked during this worker's lifetime — keeps the
// background HEAD to ~once per session even when several requests (the
// preloader + Spline's own fetch) hit the cached scene on the same page.
const revalidated = new Set();

function isScene(url) {
  return url.hostname === SCENE_HOST && url.pathname.endsWith(".splinecode");
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any older scene-cache versions so a bumped CACHE name self-cleans.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("refgd-scene-") && k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Range/partial-content requests want a 206 — let the network handle those.
  if (req.headers.has("range")) return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (!isScene(url)) return; // everything else: untouched.
  event.respondWith(cacheFirst(event, url.href));
});

async function cacheFirst(event, href) {
  const cache = await caches.open(CACHE);

  const hit = await cache.match(href, { ignoreVary: true });
  if (hit) {
    // Serve instantly; verify freshness in the background (no body re-download).
    event.waitUntil(revalidate(cache, href, hit));
    return hit;
  }

  // First load (or evicted): fetch with CORS so the stored body stays readable,
  // cache a clone in parallel, and stream the original back to the caller so
  // the loading bar still reports real byte progress.
  const res = await fetch(href, { mode: "cors", credentials: "omit" });
  if (res && res.ok) {
    event.waitUntil(cache.put(href, res.clone()).catch(() => {}));
  }
  return res;
}

/* Cheap freshness check — never re-downloads the 23 MB body. HEAD the file and
 * compare ETags; if the scene was republished at the same URL, drop the cached
 * copy so the next visit fetches the new one exactly once. */
async function revalidate(cache, href, cached) {
  if (revalidated.has(href)) return;
  revalidated.add(href);
  try {
    const head = await fetch(href, {
      method: "HEAD",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    if (!head || !head.ok) return;
    const fresh = head.headers.get("etag");
    const have = cached.headers.get("etag");
    if (fresh && have && fresh !== have) await cache.delete(href);
  } catch {
    /* offline / HEAD blocked — keep serving the cached copy */
  }
}
