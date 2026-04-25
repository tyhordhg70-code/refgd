export type Region = "USA" | "CAD" | "EU" | "UK";

export type StoreCategory =
  | "Electronics"
  | "Clothing"
  | "Jewelry"
  | "Food"
  | "Meal Plans"
  | "Home"
  | "Other";

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
