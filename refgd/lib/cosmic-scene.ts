"use client";
import { useEffect } from "react";

/**
 * Per-page activation of cosmic scenes rendered by the shared
 * Web-Worker WebGL canvas in `GalaxyBackground.tsx` →
 * `workers/galaxy.worker.js`.
 *
 * Architecture:
 *   1. GalaxyBackground initializes the worker and calls
 *      `_registerCosmicScenePusher(fn)` so this module can hand the
 *      worker an "active scene" list whenever it changes.
 *   2. Page components call `useCosmicScene('home')` (or 'chapter',
 *      'mentorship', 'evade', 'store') in a `useEffect`. The hook
 *      ref-counts requests so two components asking for the same
 *      scene never deactivate each other on unmount.
 *   3. Whenever the active set changes, the pusher fires
 *      `worker.postMessage({type:'scene', active:[…]})`. The worker
 *      flips `group.visible` on each scene; the render loop only
 *      walks visible scenes.
 *
 * Why a module-level singleton instead of React Context?
 *   The pusher needs to survive remounts and module HMR; the
 *   GalaxyBackground component lives in the root layout and is
 *   never re-rendered, while pages mount/unmount across navigations.
 *   A simple module singleton (one per browser tab) is the cleanest
 *   bridge.
 */

const counts: Record<string, number> = {};
let pushFn: ((names: string[]) => void) | null = null;

function flush() {
  if (!pushFn) return;
  const active: string[] = [];
  for (const k of Object.keys(counts)) {
    if (counts[k] > 0) active.push(k);
  }
  pushFn(active);
}

/** Called once by GalaxyBackground after the worker is ready. */
export function _registerCosmicScenePusher(
  fn: (names: string[]) => void,
): void {
  pushFn = fn;
  flush();
}

/** Called by GalaxyBackground when its worker is torn down. */
export function _unregisterCosmicScenePusher(
  fn: (names: string[]) => void,
): void {
  if (pushFn === fn) pushFn = null;
}

/**
 * Activate a worker-rendered cosmic scene for the lifetime of the
 * calling component. Pass `null`/`undefined` to no-op.
 *
 * Multiple components may activate the same scene; the scene only
 * deactivates once every request has unmounted.
 */
export function useCosmicScene(name: string | null | undefined): void {
  useEffect(() => {
    if (!name) return;
    counts[name] = (counts[name] || 0) + 1;
    flush();
    return () => {
      counts[name] = (counts[name] || 0) - 1;
      if (counts[name] <= 0) delete counts[name];
      flush();
    };
  }, [name]);
}
