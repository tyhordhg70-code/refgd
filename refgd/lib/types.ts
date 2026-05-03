export type Region = "USA" | "CAD" | "EU" | "UK";

/* v6.13.36 — Loosened from a fixed 7-member union to `string` so
   admin-added custom categories (e.g. "Beauty", "Toys", "Auto")
   can persist on stores end-to-end. The canned 7 still drive the
   default ordering / labels via the CANNED_CATEGORIES constant
   in lib/categories-store.ts and CATEGORY_LABEL in components.
   This preserves all existing usages — every prior `StoreCategory`
   literal is still a valid `string`. */
export type StoreCategory = string;

export type StoreTag = "fire" | "diamond" | "crown" | "global" | "new";

export interface Store {
  id: string;
  name: string;
  domain: string | null; // e.g. "anker.com"
  region: Region;
  category: StoreCategory;
  priceLimit: string | null; // "$2,000" / "NO LIMIT"
  itemLimit: string | null;  // "5 items" / "1 item"
  fee: string | null;        // "20%"
  timeframe: string | null;  // "1-2 weeks" / "Instant"
  notes: string | null;
  tags: StoreTag[];
  prismaticGlow: boolean;
  logoUrl: string | null;    // override; otherwise computed from domain
  rawText: string | null;    // original line
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlock {
  id: string; // e.g. "hero.welcome", "service.step1.title"
  value: string;
  updatedAt: string;
}
