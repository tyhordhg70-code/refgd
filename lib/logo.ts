/**
 * Resolve a logo URL for a given domain.
 * Strategy:
 *   1. Clearbit Logo API (https://logo.clearbit.com/<domain>) — fast, high quality
 *   2. DuckDuckGo favicon service (fallback)
 *   3. Google s2 favicons (fallback fallback)
 *
 * Pure URL builders — no network call needed at render time. The browser will
 * just request the image, so failures degrade naturally (we add an `onError`
 * fallback chain in the React component).
 */

export function clearbitLogo(domain: string): string {
  return `https://logo.clearbit.com/${encodeURIComponent(domain)}`;
}

export function ddgFavicon(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}

export function googleFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function logoFallbackChain(domain: string): string[] {
  return [clearbitLogo(domain), ddgFavicon(domain), googleFavicon(domain)];
}

/** Best-effort domain extraction from a store name like "anker.com" or "Apple". */
export function guessDomain(name: string): string | null {
  // Already looks like a domain?
  const m = name.toLowerCase().match(/([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)/);
  if (m) return m[1];
  return null;
}
