/**
 * Lightweight, dependency-free currency helpers for the custom-order page.
 *
 * Telegram Stars are always priced from USD (see lib/stars-split.ts,
 * STARS_PER_USD). To let buyers enter a price in their own currency we
 * convert to USD with a small static rate table before computing Stars.
 *
 * The rates are approximate and used ONLY to size the Stars invoice — they
 * are intentionally NOT live FX (no network call, no API key). If a rate
 * drifts materially, just edit the number here.
 */

import type { Region } from "./types";

export type CurrencyCode =
  | "USD" | "EUR" | "GBP" | "CAD" | "AUD"
  | "INR" | "NGN" | "BRL" | "JPY" | "ZAR";

export type Currency = {
  code: CurrencyCode;
  symbol: string;
  label: string;
  /** Units of this currency per 1 USD. */
  perUsd: number;
};

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$",  label: "US Dollar",          perUsd: 1 },
  { code: "EUR", symbol: "€",  label: "Euro",               perUsd: 0.92 },
  { code: "GBP", symbol: "£",  label: "British Pound",      perUsd: 0.79 },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar",    perUsd: 1.37 },
  { code: "AUD", symbol: "A$", label: "Australian Dollar",  perUsd: 1.51 },
  { code: "INR", symbol: "₹",  label: "Indian Rupee",       perUsd: 83.3 },
  { code: "NGN", symbol: "₦",  label: "Nigerian Naira",     perUsd: 1480 },
  { code: "BRL", symbol: "R$", label: "Brazilian Real",     perUsd: 5.05 },
  { code: "JPY", symbol: "¥",  label: "Japanese Yen",       perUsd: 156 },
  { code: "ZAR", symbol: "R",  label: "South African Rand", perUsd: 18.3 },
];

const BY_CODE: Record<string, Currency> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c]),
);

export function getCurrency(code: string): Currency {
  return BY_CODE[(code || "").toUpperCase()] ?? CURRENCIES[0];
}

/** Convert an amount in `code` to USD. Returns 0 for invalid input. */
export function toUsd(amount: number, code: string): number {
  const c = getCurrency(code);
  if (!isFinite(amount) || amount <= 0) return 0;
  return amount / c.perUsd;
}

export function isCurrencyCode(code: string): code is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(BY_CODE, (code || "").toUpperCase());
}

/* ------------------------------------------------------------------ *
 * Store-list price-limit currency, by region
 * ------------------------------------------------------------------ *
 * A store's `priceLimit` is free text with the currency symbol baked in
 * (e.g. "$2,000", "NO LIMIT"), and a single store row can span several
 * regions — so the symbol must be derived from the region it's shown
 * under, not from whatever the admin happened to type. These helpers do
 * that. This is a DISPLAY style and is intentionally separate from
 * CURRENCIES above (where CAD is "C$" for FX/checkout maths): on the
 * storefront Canada uses the plain dollar sign, same as the USA.
 */
export const REGION_CURRENCY_SYMBOL: Record<Region, string> = {
  USA: "$",
  CAD: "$",
  EU: "€",
  UK: "£",
};

export function regionCurrencySymbol(region: Region): string {
  return REGION_CURRENCY_SYMBOL[region] ?? "$";
}

/* Currency tokens we may need to rewrite. Multi-char tokens come first so
 * e.g. "US$" / "C$" win over a bare "$". A lone letter that clashes with
 * prose (e.g. "R" for Rand) is deliberately excluded — only "R$" is here. */
const CUR_TOKEN =
  "US\\$|U\\$|CA\\$|C\\$|AU\\$|A\\$|NZ\\$|HK\\$|S\\$|R\\$|\\$|£|€|¥|₹|₦|USD|EUR|GBP|CAD|AUD|INR|NGN|BRL|JPY|ZAR";

function prependBeforeFirstNumber(s: string, sym: string): string {
  return s.replace(/\d/, (d) => `${sym}${d}`);
}

/**
 * Return `value` with its currency symbol normalised to `region`'s currency.
 *
 *  - null / empty                   → unchanged
 *  - no digits ("NO LIMIT")         → unchanged (nothing to price)
 *  - token directly before a number → swapped in place ("$2,000" → "£2,000")
 *  - token directly after a number  → moved to a prefix ("2,000 USD" → "£2,000")
 *  - bare number ("2000")           → symbol prepended ("£2000")
 *
 * A function replacer is used everywhere because the target symbol can itself
 * contain "$", which a string replacement would treat as a special token.
 */
export function applyRegionCurrency(
  value: string | null | undefined,
  region: Region,
): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return value as string; // keep "" semantics
  if (!/\d/.test(raw)) return raw; // phrases like "NO LIMIT"

  const sym = regionCurrencySymbol(region);

  // 1) currency token(s) immediately before a number → swap in place. We
  //    detect existence with a non-global test first, so an already-correct
  //    value (e.g. "£2,000" under UK) is returned untouched rather than
  //    falling through to the prepend branch and getting double-marked.
  const before = new RegExp(`(?:${CUR_TOKEN})\\s*(?=\\d)`, "i");
  if (before.test(raw)) {
    return raw.replace(new RegExp(`(?:${CUR_TOKEN})\\s*(?=\\d)`, "gi"), () => sym);
  }

  // 2) currency token immediately after a number → drop it, prefix instead.
  //    Global so trailing-code ranges ("1,000 EUR - 2,000 EUR") get every
  //    amount normalised, not just the first ("£1,000 - £2,000").
  const after = new RegExp(`(\\d[\\d.,]*)\\s*(?:${CUR_TOKEN})`, "i");
  if (after.test(raw)) {
    return raw.replace(
      new RegExp(`(\\d[\\d.,]*)\\s*(?:${CUR_TOKEN})`, "gi"),
      (_m, num) => `${sym}${num}`,
    );
  }

  // 3) bare number with no currency token → prefix the region symbol.
  return prependBeforeFirstNumber(raw, sym);
}
