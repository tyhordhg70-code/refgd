/**
   * Shop catalog data layer.
   *
   * Source of truth: Postgres tables `shop_categories` + `shop_products`.
   *
   * On first read (cache miss + empty DB), seeds from
   * /data/shop-methods.json so the page never returns nothing on a fresh
   * deploy. After seed, the JSON file becomes irrelevant — all admin
   * edits go through this module → DB → invalidate cache.
   *
   * Products can belong to MULTIPLE categories (e.g. the Walmart
   * aged-orders product appears in both "Insert Aged Orders" and
   * "Refund / SE Methods" on the source site). We model this via
   * `category_slugs JSONB` rather than a join table to keep edits
   * single-row.
   */
  import { getPool, initDb } from "./db";
  import {
    getCachedShopCatalog,
    setCachedShopCatalog,
    invalidateShopCatalog,
  } from "./cache";
  import seed from "@/data/shop-methods.json";

  export type ShopCustomField = {
    name: string;
    required: boolean;
    placeholder?: string;
    defaultValue?: string;
    type?: string;
  };

  export type ShopProduct = {
    id: string;
    title: string;
    price: number;
    currency: string;
    image: string | null;
    summary: string;
    description: string;
    chargeType: string;
    customFields: ShopCustomField[];
    categorySlugs: string[];
    sortOrder: number;
  };

  export type ShopCategory = {
    slug: string;
    title: string;
    tagline: string;
    longDescription: string;
    image: string;
    accent: string;
    rgb: string;
    sortOrder: number;
    products: ShopProduct[];
  };

  export type ShopHero = {
    image: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    telegram: string;
  };

  export type ShopCatalog = {
    hero: ShopHero;
    categories: ShopCategory[];
  };

  function rowToCategory(row: Record<string, unknown>): Omit<ShopCategory, "products"> {
    return {
      slug: String(row.slug),
      title: String(row.title),
      tagline: (row.tagline as string | null) ?? "",
      longDescription: (row.long_description as string | null) ?? "",
      image: (row.image as string | null) ?? "",
      accent: (row.accent as string | null) ?? "violet",
      rgb: (row.rgb as string | null) ?? "167,139,250",
      sortOrder: Number(row.sort_order ?? 0),
    };
  }

  function rowToProduct(row: Record<string, unknown>): ShopProduct {
    const cf = row.custom_fields;
    const cs = row.category_slugs;
    return {
      id: String(row.id),
      title: String(row.title),
      price: Number(row.price ?? 0),
      currency: (row.currency as string | null) ?? "USD",
      image: (row.image as string | null) ?? null,
      summary: (row.summary as string | null) ?? "",
      description: (row.description as string | null) ?? "",
      chargeType: (row.charge_type as string | null) ?? "ONE_TIME",
      customFields: Array.isArray(cf) ? (cf as ShopCustomField[]) :
        typeof cf === "string" ? JSON.parse(cf) : [],
      categorySlugs: Array.isArray(cs) ? (cs as string[]) :
        typeof cs === "string" ? JSON.parse(cs) : [],
      sortOrder: Number(row.sort_order ?? 0),
    };
  }

  /** One-time seed from JSON on a fresh DB. Idempotent: checks emptiness first. */
  async function seedFromJson(): Promise<void> {
    const pool = getPool();
    const { rows: catCount } = await pool.query("SELECT COUNT(*)::int AS n FROM shop_categories");
    if ((catCount[0]?.n ?? 0) > 0) return;

    const seedTyped = seed as unknown as {
      categories: Array<{
        slug: string; title: string; tagline?: string; image?: string;
        accent?: string; rgb?: string; longDescription?: string;
        products: Array<{
          id: string; title: string; price: number; currency?: string;
          image?: string | null; summary?: string; description?: string;
          chargeType?: string; customFields?: ShopCustomField[];
        }>;
      }>;
    };

    for (let i = 0; i < seedTyped.categories.length; i++) {
      const c = seedTyped.categories[i];
      await pool.query(
        `INSERT INTO shop_categories
          (slug, title, tagline, long_description, image, accent, rgb, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (slug) DO NOTHING`,
        [c.slug, c.title, c.tagline ?? "", c.longDescription ?? "",
         c.image ?? "", c.accent ?? "violet", c.rgb ?? "167,139,250", i * 10]
      );
    }

    // Build product → categories mapping (a product can appear in multiple).
    const productMap = new Map<string, { product: typeof seedTyped.categories[0]["products"][0]; slugs: string[]; order: number }>();
    for (const c of seedTyped.categories) {
      c.products.forEach((p, idx) => {
        const existing = productMap.get(p.id);
        if (existing) {
          if (!existing.slugs.includes(c.slug)) existing.slugs.push(c.slug);
        } else {
          productMap.set(p.id, { product: p, slugs: [c.slug], order: idx * 10 });
        }
      });
    }

    for (const { product: p, slugs, order } of productMap.values()) {
      await pool.query(
        `INSERT INTO shop_products
          (id, title, price, currency, image, summary, description,
           charge_type, custom_fields, category_slugs, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.title, p.price, p.currency ?? "USD",
         p.image ?? null, p.summary ?? "", p.description ?? "",
         p.chargeType ?? "ONE_TIME",
         JSON.stringify(p.customFields ?? []),
         JSON.stringify(slugs), order]
      );
    }
  }

  async function loadCatalog(): Promise<ShopCatalog> {
    try {
      await initDb();
      await seedFromJson();
      const pool = getPool();
      const [catsRes, prodsRes] = await Promise.all([
        pool.query("SELECT * FROM shop_categories ORDER BY sort_order ASC, title ASC"),
        pool.query("SELECT * FROM shop_products ORDER BY sort_order ASC, title ASC"),
      ]);
      const cats = catsRes.rows.map(rowToCategory);
      const prods = prodsRes.rows.map(rowToProduct);
      const categories: ShopCategory[] = cats.map(c => ({
        ...c,
        products: prods.filter(p => p.categorySlugs.includes(c.slug)),
      }));
      const seedTyped = seed as unknown as { hero: ShopHero };
      const catalog: ShopCatalog = { hero: seedTyped.hero, categories };
      setCachedShopCatalog(catalog);
      return catalog;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[shop-catalog] DB unavailable, falling back to JSON:", (err as Error).message);
      }
      const seedTyped = seed as unknown as ShopCatalog;
      const fallback: ShopCatalog = {
        hero: seedTyped.hero,
        categories: seedTyped.categories.map(c => ({
          ...c,
          sortOrder: 0,
          products: c.products.map(p => ({
            ...p,
            customFields: p.customFields ?? [],
            categorySlugs: [c.slug],
            sortOrder: 0,
          })),
        })),
      };
      setCachedShopCatalog(fallback);
      return fallback;
    }
  }

  export async function getShopCatalog(): Promise<ShopCatalog> {
    return getCachedShopCatalog() ?? (await loadCatalog());
  }

  export async function getCategory(slug: string): Promise<ShopCategory | null> {
    const c = await getShopCatalog();
    return c.categories.find(cat => cat.slug === slug) ?? null;
  }

  export async function getProduct(id: string): Promise<ShopProduct | null> {
    const c = await getShopCatalog();
    for (const cat of c.categories) {
      const p = cat.products.find(pr => pr.id === id);
      if (p) return p;
    }
    return null;
  }

  // ─── Mutations ──────────────────────────────────────────────────────────────

  export async function upsertCategory(c: Omit<ShopCategory, "products">): Promise<void> {
    await initDb();
    const now = new Date().toISOString();
    await getPool().query(
      `INSERT INTO shop_categories
         (slug, title, tagline, long_description, image, accent, rgb, sort_order, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (slug) DO UPDATE SET
         title            = EXCLUDED.title,
         tagline          = EXCLUDED.tagline,
         long_description = EXCLUDED.long_description,
         image            = EXCLUDED.image,
         accent           = EXCLUDED.accent,
         rgb              = EXCLUDED.rgb,
         sort_order       = EXCLUDED.sort_order,
         updated_at       = EXCLUDED.updated_at`,
      [c.slug, c.title, c.tagline, c.longDescription, c.image,
       c.accent, c.rgb, c.sortOrder, now]
    );
    invalidateShopCatalog();
  }

  export async function deleteCategory(slug: string): Promise<void> {
    await initDb();
    const pool = getPool();
    // Remove the slug from any products that reference it
    await pool.query(
      `UPDATE shop_products
         SET category_slugs = COALESCE((
           SELECT jsonb_agg(elem) FROM jsonb_array_elements_text(category_slugs) AS elem
           WHERE elem <> $1
         ), '[]'::jsonb)
         WHERE category_slugs @> to_jsonb(ARRAY[$1::text])`,
      [slug]
    );
    await pool.query("DELETE FROM shop_categories WHERE slug = $1", [slug]);
    invalidateShopCatalog();
  }

  export async function upsertProduct(p: ShopProduct): Promise<void> {
    await initDb();
    const now = new Date().toISOString();
    await getPool().query(
      `INSERT INTO shop_products
         (id, title, price, currency, image, summary, description,
          charge_type, custom_fields, category_slugs, sort_order, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         title          = EXCLUDED.title,
         price          = EXCLUDED.price,
         currency       = EXCLUDED.currency,
         image          = EXCLUDED.image,
         summary        = EXCLUDED.summary,
         description    = EXCLUDED.description,
         charge_type    = EXCLUDED.charge_type,
         custom_fields  = EXCLUDED.custom_fields,
         category_slugs = EXCLUDED.category_slugs,
         sort_order     = EXCLUDED.sort_order,
         updated_at     = EXCLUDED.updated_at`,
      [p.id, p.title, p.price, p.currency, p.image, p.summary, p.description,
       p.chargeType, JSON.stringify(p.customFields), JSON.stringify(p.categorySlugs),
       p.sortOrder, now]
    );
    invalidateShopCatalog();
  }

  export async function deleteProduct(id: string): Promise<void> {
    await initDb();
    await getPool().query("DELETE FROM shop_products WHERE id = $1", [id]);
    invalidateShopCatalog();
  }
  