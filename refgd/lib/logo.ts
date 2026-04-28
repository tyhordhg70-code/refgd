/**
 * Resolve a logo URL for a given domain.
 *
 * Fallback chain order (Google → DDG → Clearbit) is chosen for reliability:
 * Google S2 almost never 404s; Clearbit 404s frequently for unknown brands,
 * causing browser-console noise when used as the first candidate.
 *
 * Pure URL builders — no network call at render time.
 */

import { getLogoOverride } from "./logo-overrides";

export function googleFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function ddgFavicon(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}

export function clearbitLogo(domain: string): string {
  return `https://logo.clearbit.com/${encodeURIComponent(domain)}`;
}

/**
 * Returns the ordered fallback chain for a domain.
 *
 * Order: Google S2 (most reliable, almost never 404s) → DDG → Clearbit.
 *
 * Previous order was Clearbit → DDG → Google. Clearbit returns HTTP 404
 * for every domain it doesn't index, which caused a spray of browser-
 * console 404 errors as StoreCard walked the chain via onError. Moving
 * Clearbit to last position means the chain reaches a working image URL
 * quickly for unknown brands while still serving Clearbit's higher-quality
 * logo for major brands that do have one.
 */
export function logoFallbackChain(domain: string): string[] {
  return [googleFavicon(domain), ddgFavicon(domain), clearbitLogo(domain)];
}

/**
 * Returns the fallback chain for a store, consulting the name-based
 * override map first so stores with an incorrect or missing `domain`
 * field still resolve to the right logo.
 */
export function logoChainForStore(name: string, domain?: string | null): string[] {
  const overrideDomain = getLogoOverride(name);

  if (overrideDomain) {
    const overrideChain = logoFallbackChain(overrideDomain);
    if (!domain || domain === overrideDomain) return overrideChain;
    const rawChain = logoFallbackChain(domain);
    const seen = new Set(overrideChain);
    return [...overrideChain, ...rawChain.filter((u) => !seen.has(u))];
  }

  return domain ? logoFallbackChain(domain) : [];
}

/** Best-effort domain extraction from a store name like "anker.com" or "Apple". */
export function guessDomain(name: string): string | null {
  // Already looks like a domain?
  const m = name.toLowerCase().match(/([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)/);
  if (m) return m[1];
  return null;
}
