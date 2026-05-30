"use client";

/**
 * TEMPORARY on-device freeze diagnostic.
 *
 * iOS Safari freezes on opening the vouches modal cannot be reproduced in
 * the dev environment, and no JS infinite loop or CSS hang trigger could be
 * located by static reading. This module records a synchronous "breadcrumb"
 * to localStorage BEFORE each step of the modal-open sequence runs. Because
 * each crumb is persisted before the next (potentially hanging) step, a hard
 * main-thread freeze still leaves a durable trail: the LAST crumb written is
 * the step that hung. After a freeze the user force-closes the tab, reopens
 * the page, and <FreezeDebugPanel> reads the trail back out.
 *
 * Remove this module (and its call sites) once the freeze is located.
 */

const KEY = "rg_bc";
const MAX = 60;

export type Crumb = { t: number; s: string };

/** Record a breadcrumb synchronously. Safe to call during render/SSR. */
export function bc(step: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr: Crumb[] = raw ? JSON.parse(raw) : [];
    arr.push({ t: Date.now(), s: step });
    window.localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
  } catch {
    /* localStorage unavailable / quota — ignore */
  }
}

export function readBc(): Crumb[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Crumb[]) : [];
  } catch {
    return [];
  }
}

export function clearBc(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

let installed = false;
/** Capture thrown errors / rejections as breadcrumbs (won't catch pure loops). */
export function installFreezeHandlers(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  window.addEventListener("error", (e: ErrorEvent) => {
    bc("ERR:" + String(e?.message || "error").slice(0, 90));
  });
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const r = e?.reason as { message?: string } | string | undefined;
    const msg = typeof r === "string" ? r : r?.message || "rejection";
    bc("REJ:" + String(msg).slice(0, 90));
  });
}
