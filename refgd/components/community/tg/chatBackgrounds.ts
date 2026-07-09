"use client";

/**
 * Chat wallpaper registry for the /community Telegram replica.
 *
 * Every entry mirrors a real Telegram wallpaper deep link (t.me/bg/<slug>).
 * The assets are self-hosted under /public/tg-bg — the pattern SVGs come from
 * t.me/bg/<slug>?pattern_file=1 and the photo wallpapers from the CDN URL the
 * t.me preview page embeds (those carry expiring tokens, so they can't be
 * hot-linked). Gradient wallpapers are painted exactly like the t.me preview:
 * Telegram's own TWallpaper canvas engine (vendored — see loadWallpaperEngine)
 * plus a pattern layer at 420px with mix-blend-mode:overlay. A negative
 * intensity means Telegram's "dark" style: black backdrop where the pattern
 * masks the gradient through it.
 */

export interface PatternChatBackground {
  id: string;
  kind: "pattern";
  /** File under /tg-bg/ (the pattern SVG). */
  file: string;
  /** Gradient colors in t.me bg_color order (2–4 hex values, no #). */
  colors: string[];
  /** t.me intensity: positive = light overlay, negative = dark masked. */
  intensity: number;
}

export interface ImageChatBackground {
  id: string;
  kind: "image";
  /** File under /tg-bg/ (the full-size JPEG). */
  file: string;
  /** Small preview used by the picker grid. */
  preview: string;
}

export type ChatBackgroundDef = PatternChatBackground | ImageChatBackground;

const pattern = (
  id: string,
  slug: string,
  bgColor: string,
  intensity: number,
): PatternChatBackground => ({
  id,
  kind: "pattern",
  file: `${slug}.svg`,
  colors: bgColor.split("~"),
  intensity,
});

const image = (id: string, slug: string): ImageChatBackground => ({
  id,
  kind: "image",
  file: `${slug}.jpg`,
  preview: `${slug}.prev.jpg`,
});

/** Owner-curated wallpaper set (order = picker grid order). */
export const CHAT_BACKGROUNDS: ChatBackgroundDef[] = [
  // Default — first tile.
  pattern(
    "bg-01",
    "CJNyxPMgSVAEAAAAvW9sMwc51cw",
    "dceb92~8fe1d6~67a3f2~85d685",
    50,
  ),
  pattern("bg-02", "y-kz9Pn5YFISAAAAKzTRUSqr5nE", "b2b1ee~d4a7c9~6c8cd4", 50),
  pattern(
    "bg-03",
    "DRaa0SbvYVIjAAAAWv3uHfEiYyI",
    "a464f4~edac4c~e96caf~f7dd6d",
    50,
  ),
  pattern(
    "bg-04",
    "DRaa0SbvYVIjAAAAWv3uHfEiYyI",
    "fec496~dd6cb9~962fbf~4f5bd5",
    50,
  ),
  pattern(
    "bg-05",
    "4fz0g1CFYVIJAAAAbTViJ9W4tCw",
    "73caff~d5f7ff~fb9ae5~fbd9e6",
    50,
  ),
  pattern(
    "bg-06",
    "MIo6r0qGSFAFAAAAtL8TsDzNX60",
    "b0cdeb~9fb0ea~bbead5~b2e3dd",
    50,
  ),
  pattern(
    "bg-07",
    "BbkPzy4qaVINAAAAaB2Pd5Iy7Zg",
    "97beeb~b1e9ea~c6b1ef~efb7dc",
    50,
  ),
  pattern(
    "bg-08",
    "bJcwphEAYVINAAAA5jpWNRMqilA",
    "e4b2ea~8376c2~eab9d9~b493e6",
    50,
  ),
  // Dark variant: pattern reveals the gradient through a black backdrop.
  pattern(
    "bg-09",
    "aiuT0cIzaVIHAAAAjS-ebiVKLtU",
    "e4b2ea~8376c2~eab9d9~b493e6",
    -35,
  ),
  image("bg-10", "sp-xMi7A-VEBAAAABRn6rGsUKFs"),
  image("bg-11", "G87eMCd6-FEBAAAApSBi5CBqx0c"),
  image("bg-12", "0k-hpUIo-VEBAAAAN_yVCPEg9mI"),
  image("bg-13", "5LkIrHKWAFIBAAAAM0Fy4n1W65E"),
  image("bg-14", "ExhVI_Uj-FEBAAAA9CC2f4neVfc"),
  image("bg-15", "maIM-YeHAVIBAAAAkvnFt2M-tiQ"),
  image("bg-16", "9F4oTa5p-FEBAAAA9A2ENoEIiHA"),
  image("bg-17", "wRHnDZD3-FEBAAAAjIIJrlTu1xg"),
  image("bg-18", "RKoGzb5giVIBAAAAW_S7sn3YmKc"),
  image("bg-19", "I9m3arXQiFIBAAAAyYGQ6povw_E"),
];

export const DEFAULT_CHAT_BG_ID = "bg-01";

const STORAGE_KEY = "tg-chat-bg-v1";
/** Fired on window whenever the selection changes so the live layer updates. */
export const CHAT_BG_EVENT = "refgd:chat-bg";

export function getChatBackgroundById(id: string): ChatBackgroundDef {
  return (
    CHAT_BACKGROUNDS.find((b) => b.id === id) ??
    CHAT_BACKGROUNDS.find((b) => b.id === DEFAULT_CHAT_BG_ID) ??
    CHAT_BACKGROUNDS[0]
  );
}

export function getSelectedChatBackgroundId(): string {
  if (typeof window === "undefined") return DEFAULT_CHAT_BG_ID;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && CHAT_BACKGROUNDS.some((b) => b.id === v)) return v;
  } catch {
    // storage blocked — fall through to the default
  }
  return DEFAULT_CHAT_BG_ID;
}

export function setSelectedChatBackgroundId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage blocked — still apply for this session via the event
  }
  window.dispatchEvent(new CustomEvent(CHAT_BG_EVENT, { detail: id }));
}

/**
 * The t.me preview page writes data-colors in REVERSE bg_color order
 * (bg_color=a~b~c~d → data-colors="d,c,b,a"); mirror that so each color lands
 * on the same corner as the real Telegram preview.
 */
export function toDataColors(colors: string[]): string {
  return [...colors].reverse().join(",");
}

/** Telegram's own tiny (3 KB) free-form gradient renderer, vendored. */
export interface WallpaperEngine {
  init(el: HTMLElement): void;
  update(): void;
  animate(on: boolean): void;
}

let enginePromise: Promise<WallpaperEngine | null> | null = null;

/**
 * Lazy-load /vendor/tgwallpaper.min.js (same no-npm-dependency rule as the
 * vendored Lottie player — dependency changes are a Render-outage risk).
 * Resolves null if the script can't load; callers fall back to the CSS
 * gradient underlay so the chat never sits on a bare white pane.
 */
export function loadWallpaperEngine(): Promise<WallpaperEngine | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!enginePromise) {
    enginePromise = new Promise((resolve) => {
      const w = window as unknown as { TWallpaper?: WallpaperEngine };
      if (w.TWallpaper) {
        resolve(w.TWallpaper);
        return;
      }
      const s = document.createElement("script");
      s.src = "/vendor/tgwallpaper.min.js";
      s.async = true;
      s.onload = () => resolve(w.TWallpaper ?? null);
      s.onerror = () => {
        enginePromise = null; // allow a later retry
        resolve(null);
      };
      document.head.appendChild(s);
    });
  }
  return enginePromise;
}

/** Static CSS gradient fallback/preview for a pattern wallpaper. */
export function cssGradient(colors: string[]): string {
  const stops = [...colors].map((c) => `#${c}`);
  if (stops.length === 1) return stops[0];
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}
