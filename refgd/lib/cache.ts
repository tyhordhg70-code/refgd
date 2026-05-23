/**
   * Module-level in-memory cache.
   *
   * Because this module is loaded once per Node.js process, its top-level
   * variables persist across every request for the lifetime of the server.
   * Restarting the server clears the cache and triggers one fresh DB read.
   *
   * Cache invalidation: any write operation (upsert/delete store, set content)
   * calls the matching invalidate* function so the next read re-fetches from DB.
   */

  import type { Store } from "./types";
  import type { ShopCatalog } from "./shop-catalog";

  declare global {
    var _cache_dbInitialized: boolean | undefined;
    var _cache_dbInitPromise: Promise<void> | undefined;
    var _cache_stores: Store[] | null | undefined;
    var _cache_content: Map<string, string> | null | undefined;
    var _cache_shopCatalog: ShopCatalog | null | undefined;
  }

  // ─── DB init ────────────────────────────────────────────────────────────────
  export function isDbInitialized(): boolean {
    return global._cache_dbInitialized === true;
  }
  export function setDbInitialized(): void {
    global._cache_dbInitialized = true;
    global._cache_dbInitPromise = undefined;
  }
  export function getDbInitPromise(): Promise<void> | undefined {
    return global._cache_dbInitPromise;
  }
  export function setDbInitPromise(p: Promise<void>): void {
    global._cache_dbInitPromise = p;
  }

  // ─── Stores ─────────────────────────────────────────────────────────────────
  export function getCachedStores(): Store[] | null {
    return global._cache_stores ?? null;
  }
  export function setCachedStores(stores: Store[]): void {
    global._cache_stores = stores;
  }
  export function invalidateStores(): void {
    global._cache_stores = null;
  }

  // ─── Content blocks ──────────────────────────────────────────────────────────
  export function getCachedContent(): Map<string, string> | null {
    return global._cache_content ?? null;
  }
  export function setCachedContent(content: Map<string, string>): void {
    global._cache_content = content;
  }
  export function invalidateContent(): void {
    global._cache_content = null;
  }

  // ─── Shop catalog ───────────────────────────────────────────────────────────
  export function getCachedShopCatalog(): ShopCatalog | null {
    return global._cache_shopCatalog ?? null;
  }
  export function setCachedShopCatalog(c: ShopCatalog): void {
    global._cache_shopCatalog = c;
  }
  export function invalidateShopCatalog(): void {
    global._cache_shopCatalog = null;
  }
  