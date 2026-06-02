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
