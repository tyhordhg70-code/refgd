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
 *   • a streaming downloader that reports real byte progress and warms the
 *     HTTP cache so the scene component reuses it (no second download).
 */

export const HOME_SCENE_URL =
  "https://prod.spline.design/mzZcfxXnOQsM5LXz/scene.splinecode";

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
  if (norm(pathname) === "/" && sceneEligible()) {
    return [{ url: HOME_SCENE_URL, bytesHint: 23_000_000 }];
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
  if (p === "/") return sceneEligible();
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
