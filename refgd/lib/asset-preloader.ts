"use client";

/**
 * Route-aware heavy-asset preloader.
 *
 * Why this exists
 * ───────────────
 * The home page renders a large remote 3D scene (the Spline galaxy, a
 * ~23 MB `scene.splinecode`). If the page is revealed before that file is
 * downloaded the hero shows only the flat "default" backdrop for many
 * seconds, then pops in. The user wants the heavy file fully downloaded
 * BEHIND the loading overlay, and entry granted only once it's in — and
 * the same behaviour applied when navigating to a heavy page.
 *
 * This module is the single source of truth for:
 *   • which remote assets a route must fully download before reveal,
 *   • which routes mount a cinematic scene that announces `refgd:scene-ready`,
 *   • a streaming downloader that reports real byte progress, warms the HTTP
 *     cache, and persists the scene into the Cache Storage API so it is
 *     downloaded ONCE and served locally on every future visit (paired with
 *     the scene service worker in `public/sw.js`, which serves Spline's own
 *     fetch of the same file from that cache).
 */

// Served same-origin (and brotli-compressed) by app/hero-scene.splinecode/
// route.ts, which sets `Cache-Control: immutable` so the browser's own disk
// cache reuses it on every repeat visit. (Legacy absolute CDN URLs are still
// handled by the Cache Storage path below; same-origin relies on the HTTP
// cache instead, which sidesteps the service-worker double-decode hazard a
// Content-Encoding response would otherwise hit.)
export const HOME_SCENE_URL = "/hero-scene.splinecode";

/**
 * Cache Storage bucket the heavy scene is persisted into so it downloads ONCE
 * and is reused on every future visit. Must stay in sync with CACHE in
 * `public/sw.js` — the service worker serves Spline's own fetch from the same
 * bucket, while the preloader (below) seeds it from its progress download.
 */
const SCENE_CACHE = "refgd-scene-v1";

/** True for the heavy remote Spline scene file (the only thing we persist). */
function isSceneAsset(url: string): boolean {
  return /\.splinecode(\?|$)/.test(url);
}

export type HeavyAsset = { url: string; bytesHint?: number };

/** Normalise a pathname: strip trailing slashes, default to "/". */
function norm(pathname: string): string {
  if (!pathname) return "/";
  const p = pathname.replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

/**
 * The heavy Spline galaxy now mounts on mobile too (it renders a static,
 * idle-frozen hero there). So the only case where the scene is NOT shown —
 * and therefore where we must NOT download 23 MB nor wait on a scene-ready
 * event that will never fire — is prefers-reduced-motion, which falls back to
 * the lightweight MobileStars canvas.
 */
export function sceneEligible(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  } catch {
    /* matchMedia unavailable — assume eligible */
  }
  return true;
}

/**
 * Heavy CROSS-NETWORK assets a route must fully download before its content
 * is revealed. Today only the home page pulls a large remote file. Local
 * same-origin assets (e.g. the evade frame sequence) are handled by their
 * own component plus the scene-ready signal and don't need listing here.
 */
export function heavyAssetsForPath(_pathname: string): HeavyAsset[] {
  // The home hero no longer pulls the ~23 MB Spline scene — it is now a tiny
  // (~2.4 MB) scroll-scrubbed WebP frame sequence that paints its first frame
  // instantly and streams the rest behind the page. So there is no heavy
  // cross-network asset to gate the reveal on; the loader uses its fast path.
  return [];
}

/**
 * Routes that mount a cinematic scene which dispatches `refgd:scene-ready`
 * once its first frame has actually painted. The loader waits for that
 * signal (in addition to any heavy downloads) so the overlay never lifts
 * onto a not-yet-rendered canvas.
 */
export function pathHasScene(pathname: string): boolean {
  const p = norm(pathname);
  // Home no longer mounts a WebGL scene that announces `refgd:scene-ready`; its
  // hero is a canvas frame sequence that paints immediately, so the loader must
  // NOT wait on a scene-ready signal here (it would never resolve the long way).
  if (p === "/evade-cancelations") return true;
  return false;
}

/**
 * Fully download one asset, reporting received bytes via onProgress.
 * Resolves (never rejects) so a flaky asset can't strand the overlay.
 * Reading the body to completion also warms the HTTP cache, so the
 * component that later renders the scene reuses it instead of
 * re-downloading.
 */
export async function downloadAsset(
  asset: HeavyAsset,
  onProgress?: (receivedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Repeat-visit fast path: if the scene is already persisted in Cache Storage
  // (seeded on a previous visit), there is nothing to download — report
  // complete instantly so the splash never re-pulls the ~23 MB file.
  if (
    isSceneAsset(asset.url) &&
    /^https?:/.test(asset.url) &&
    typeof caches !== "undefined"
  ) {
    try {
      const cache = await caches.open(SCENE_CACHE);
      const hit = await cache.match(asset.url, { ignoreVary: true });
      if (hit) {
        onProgress?.(asset.bytesHint ?? 1, asset.bytesHint ?? 1);
        return;
      }
    } catch {
      /* Cache Storage unavailable — fall through to a normal network download */
    }
  }
  try {
    const res = await fetch(asset.url, {
      mode: "cors",
      credentials: "omit",
      signal,
    });
    if (!res.ok || !res.body) {
      // Still warm the cache via a plain read, then report complete.
      try {
        await res.arrayBuffer();
      } catch {
        /* noop */
      }
      onProgress?.(asset.bytesHint ?? 1, asset.bytesHint ?? 1);
      return;
    }
    // Persist the scene as it streams so it is downloaded ONCE: a clone is
    // written to Cache Storage (the same bucket the service worker serves from)
    // while the original is read below for progress. Seeding it here means even
    // the very first visit's download is reused — by Spline's own fetch and by
    // every future visit — instead of being pulled again.
    if (
      isSceneAsset(asset.url) &&
      /^https?:/.test(asset.url) &&
      typeof caches !== "undefined"
    ) {
      void persistScene(asset.url, res.clone());
    }
    const lenHeader = res.headers.get("content-length");
    const total = lenHeader ? parseInt(lenHeader, 10) : asset.bytesHint ?? 0;
    const reader = res.body.getReader();
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value?.length ?? 0;
      onProgress?.(received, total || received);
    }
    onProgress?.(received, total || received);
  } catch {
    // Aborted or network error — report "complete" so the gate proceeds.
    onProgress?.(asset.bytesHint ?? 1, asset.bytesHint ?? 1);
  }
}

/**
 * Persist a freshly fetched scene response into Cache Storage so it survives
 * across visits. Takes a CLONE of the in-flight response (the original keeps
 * streaming for progress), so this adds no extra network download. Best-effort:
 * swallows quota / write errors. No-op if the scene is already cached.
 */
async function persistScene(url: string, res: Response): Promise<void> {
  try {
    if (!res.ok) return;
    const cache = await caches.open(SCENE_CACHE);
    const existing = await cache.match(url, { ignoreVary: true });
    if (!existing) await cache.put(url, res);
  } catch {
    /* quota exceeded / Cache Storage unavailable — fine, the SW still caches it */
  }
}

/**
 * Download every heavy asset for a route, reporting an aggregate 0..1
 * fraction. Resolves when all settle. Never rejects.
 */
export async function downloadHeavyAssets(
  assets: HeavyAsset[],
  onFraction?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (assets.length === 0) {
    onFraction?.(1);
    return;
  }
  const received = new Array(assets.length).fill(0) as number[];
  const totals = assets.map((a) => a.bytesHint ?? 1);
  const emit = () => {
    const sumReceived = received.reduce((s, n) => s + n, 0);
    const sumTotal = totals.reduce((s, n) => s + n, 0) || 1;
    onFraction?.(Math.min(1, sumReceived / sumTotal));
  };
  await Promise.all(
    assets.map((a, i) =>
      downloadAsset(
        a,
        (r, t) => {
          received[i] = r;
          if (t) totals[i] = t;
          emit();
        },
        signal,
      ),
    ),
  );
  onFraction?.(1);
}
