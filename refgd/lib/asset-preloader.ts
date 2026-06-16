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
export function heavyAssetsForPath(pathname: string): HeavyAsset[] {
  const p = norm(pathname);
  // Evade-Cancelations hero plays a ~13 MB neon-vortex MP4. Download it IN FULL
  // behind the loading overlay — reading the body to completion warms the HTTP
  // cache (next.config serves /uploads/* immutable for a year), so the <video>
  // then plays straight from cache with NO buffering the instant the page is
  // revealed. This gates the splash on the whole file, which is the desired
  // "fully load before reveal" behaviour for this route.
  if (p === "/evade-cancelations") {
    return [{ url: "/uploads/evade-hero-vortex.mp4", bytesHint: 12987759 }];
  }
  // Exclusive-Mentorships hero plays an ~8 MB "Liquid Reflections" boomerang
  // loop. Download it IN FULL behind the loading overlay so the <video> plays
  // straight from the browser's (immutable, year-long) HTTP cache the instant
  // the page is revealed — no buffering, no pop-in. The resumable downloader
  // below keeps this going across mobile tab suspensions, and the video
  // component announces `refgd:scene-ready` once it can play so the splash
  // lifts promptly. (next.config serves /mentorship-bg.* immutable.)
  if (p === "/exclusive-mentorships") {
    return [{ url: "/mentorship-bg.mp4", bytesHint: 8231222 }];
  }
  // The home page is the usual first visit, so we DO gate it: download the
  // ~40 MB "sphere montage" hero (/sphere-montage.mp4, served immutable) in
  // full behind the splash so the hero plays with zero buffering on reveal.
  // CosmicJourney dispatches `refgd:scene-ready` on the video's loadeddata, so
  // the splash lifts the instant the download finishes + the first frame is
  // ready (no wasted grace). On a slow first visit this is bounded by the 30 s
  // ceiling in LoadingScreen; repeat visits are instant from the immutable
  // cache. (The 17 MB /sphere-bg.mp4 left in public/ is a stale, unused file —
  // the live hero <video> in CosmicJourney points at /sphere-montage.mp4.)
  if (p === "/") {
    return [{ url: "/sphere-montage.mp4", bytesHint: 40549919 }];
  }
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
 * Resolve once the page is foregrounded (or immediately if it already is).
 * Used to pause-and-resume heavy downloads around mobile tab suspensions:
 * while the tab is hidden the browser runs no timers and may have killed the
 * in-flight fetch, so we hold here until the user returns and then continue
 * the stream. Also resolves if the supplied abort signal fires so callers can
 * bail out instead of waiting forever.
 */
function waitUntilVisible(signal?: AbortSignal): Promise<void> {
  if (
    typeof document === "undefined" ||
    document.visibilityState !== "hidden"
  ) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const cleanup = () => {
      document.removeEventListener("visibilitychange", onVis);
      signal?.removeEventListener("abort", onAbort);
    };
    const onVis = () => {
      if (document.visibilityState !== "hidden") {
        cleanup();
        resolve();
      }
    };
    const onAbort = () => {
      cleanup();
      resolve();
    };
    document.addEventListener("visibilitychange", onVis);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
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
  // Resumable streaming download.
  //
  // A mobile tab that the user backgrounds (switches apps, opens another tab,
  // locks the phone) gets SUSPENDED mid-stream — iOS frequently kills the
  // in-flight fetch outright. The old code caught that error and reported the
  // asset "complete" with only a partial body cached, so the <video> then had
  // to re-buffer the rest from the network when the page was finally revealed.
  //
  // Instead we now RESUME: track how many bytes we have and, whenever the
  // stream is cut short, wait until the tab is foregrounded again and continue
  // from that byte with a `Range` request. The download therefore "keeps
  // going" across any number of background trips until the whole file lands in
  // the browser's (immutable) HTTP cache. Desktop tabs are never suspended, so
  // there the very first pass simply runs straight to the end.
  let received = 0;
  let total = asset.bytesHint ?? 0;
  let attempts = 0;
  for (;;) {
    if (signal?.aborted) {
      onProgress?.(total || 1, total || 1);
      return;
    }
    try {
      const headers: Record<string, string> = {};
      if (received > 0) headers.Range = `bytes=${received}-`;
      const res = await fetch(asset.url, {
        mode: "cors",
        credentials: "omit",
        signal,
        headers,
      });
      // Server ignored our Range and replied 200 from the start → reset the
      // counter so we don't append onto an offset that was never skipped.
      if (received > 0 && res.status === 200) received = 0;
      if (!res.ok && res.status !== 206) {
        // Non-retryable HTTP status — warm whatever we can, report complete.
        try {
          await res.arrayBuffer();
        } catch {
          /* noop */
        }
        onProgress?.(total || 1, total || 1);
        return;
      }
      // On the first (full) response, seed the scene cache and lock in the
      // real byte total from the Content-Length header.
      if (received === 0) {
        if (
          isSceneAsset(asset.url) &&
          /^https?:/.test(asset.url) &&
          typeof caches !== "undefined"
        ) {
          void persistScene(asset.url, res.clone());
        }
        const lenHeader = res.headers.get("content-length");
        if (lenHeader) total = parseInt(lenHeader, 10) || total;
      }
      if (!res.body) {
        try {
          await res.arrayBuffer();
        } catch {
          /* noop */
        }
        onProgress?.(total || 1, total || 1);
        return;
      }
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value?.length ?? 0;
        onProgress?.(received, total || received);
      }
      // Stream finished. If a known total says we are still short, the
      // connection was cut early (a background suspension) — resume once the
      // tab is visible again instead of giving up with a partial file.
      if (total && received < total && !signal?.aborted) {
        await waitUntilVisible(signal);
        if (signal?.aborted || ++attempts > 60) {
          onProgress?.(received, total);
          return;
        }
        continue;
      }
      onProgress?.(received, total || received);
      return;
    } catch {
      // The gate aborted us (component unmounted) → stop cleanly.
      if (signal?.aborted) {
        onProgress?.(total || received || 1, total || received || 1);
        return;
      }
      // Network error, or a suspension that killed the fetch. Wait until the
      // tab is foregrounded, then loop to resume from `received` via Range.
      await waitUntilVisible(signal);
      if (signal?.aborted || ++attempts > 60) {
        onProgress?.(total || received || 1, total || received || 1);
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
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

/**
 * All large hero media across the site, tagged with the route(s) that own
 * them. Used by the BackgroundPrefetcher to warm every OTHER route's heavy
 * video into the browser's (immutable, year-long) HTTP cache while the user
 * sits on the current page — so navigating to that page later plays straight
 * from cache with no buffering and no loading-screen wait.
 */
export type PrefetchAsset = HeavyAsset & { routes: string[] };

export const PREFETCHABLE_HEAVY_MEDIA: PrefetchAsset[] = [
  // Home "sphere montage" hero loop (~40 MB). It IS splash-gated on the home
  // page (see heavyAssetsForPath), so this entry only warms it when the user
  // is browsing OTHER pages — prefetchOtherRouteMedia skips the current route.
  { url: "/sphere-montage.mp4", bytesHint: 40549919, routes: ["/"] },
  // Evade-Cancelations neon-vortex hero.
  { url: "/uploads/evade-hero-vortex.mp4", bytesHint: 12987759, routes: ["/evade-cancelations"] },
  // Exclusive-Mentorships "Liquid Reflections" hero loop.
  { url: "/mentorship-bg.mp4", bytesHint: 8231222, routes: ["/exclusive-mentorships"] },
];

const prefetchedMedia = new Set<string>();
const prefetchInFlight = new Set<string>();

/**
 * Only background-prefetch when the connection can spare it. Respects the
 * user's Data Saver toggle and skips 2g-class links entirely so we never burn
 * a metered/slow mobile plan warming videos the user may never visit. Returns
 * true when the Network Information API is unavailable (can't tell → allow).
 */
function connectionAllowsPrefetch(): boolean {
  if (typeof navigator === "undefined") return true;
  const c = (
    navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!c) return true;
  if (c.saveData) return false;
  if (c.effectiveType === "slow-2g" || c.effectiveType === "2g") return false;
  return true;
}

/** Resolve on the next idle slot (or after a short delay if unsupported). */
function whenIdle(): Promise<void> {
  return new Promise<void>((resolve) => {
    const ric = (
      window as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") ric(() => resolve(), { timeout: 3000 });
    else window.setTimeout(resolve, 600);
  });
}

/**
 * Warm every heavy video that does NOT belong to the current route into the
 * HTTP cache, one at a time, during idle slots. Fire-and-forget: it is NOT
 * tied to the page lifecycle (no abort on navigation) so a large file finishes
 * even if the user moves around, and the resumable `downloadAsset` keeps it
 * going across mobile tab suspensions. Module-level sets dedupe across route
 * changes so each file is fetched at most once per session (and repeat visits
 * are served from the immutable cache with no network at all).
 */
export async function prefetchOtherRouteMedia(
  currentPath: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!connectionAllowsPrefetch()) return;
  const here = norm(currentPath);
  for (const asset of PREFETCHABLE_HEAVY_MEDIA) {
    if (asset.routes.some((r) => norm(r) === here)) continue;
    if (prefetchedMedia.has(asset.url) || prefetchInFlight.has(asset.url)) {
      continue;
    }
    await whenIdle();
    // Re-check after the idle wait: the user may have toggled Data Saver, the
    // connection may have degraded, or another mount may have claimed this file.
    if (!connectionAllowsPrefetch()) return;
    if (prefetchedMedia.has(asset.url) || prefetchInFlight.has(asset.url)) {
      continue;
    }
    prefetchInFlight.add(asset.url);
    try {
      await downloadAsset({ url: asset.url, bytesHint: asset.bytesHint });
      prefetchedMedia.add(asset.url);
    } finally {
      prefetchInFlight.delete(asset.url);
    }
  }
}
