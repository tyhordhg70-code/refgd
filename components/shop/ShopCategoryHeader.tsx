"use client";

  import Link from "next/link";
  import EditableText from "@/components/EditableText";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";

  import type { ShopCategory as Category } from "@/lib/shop-catalog";

  /**
   * ShopCategoryHeader — compact header for /shop-methods/[slug].
   *
   * Deliberately slim: a breadcrumb, the category quick-switcher chip row, and
   * a tight title + tagline. The previous version wrapped everything in a tall
   * gradient "hero card" with a large image plate, which pushed the product
   * grid a full screen down — users had to scroll far to reach the products.
   * Removing that box card lets the product list sit right under the header.
   */
  export default function ShopCategoryHeader({
    category: c,
    allCategories,
  }: { category: Category; allCategories: Category[] }) {
    return (
      <section className="relative z-10 overflow-x-clip pb-4 pt-8 sm:pb-6 sm:pt-12">
        <div className="container-wide relative">
          <Link
            href="/shop-methods"
            className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/60 transition hover:text-white"
          >
            <span aria-hidden>←</span> All Categories
          </Link>

          {/* Quick-switcher chip row */}
          <nav aria-label="Categories" className="mb-7 flex flex-wrap gap-2">
            {allCategories.map((cat) => {
              const active = cat.slug === c.slug;
              return (
                <Link
                  key={cat.slug}
                  href={`/shop-methods/${cat.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`group inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    active
                      ? "border-white/70 bg-white/15 text-white"
                      : "border-white/30 bg-white/[0.04] text-white/80 hover:border-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                  style={
                    active
                      ? {
                          boxShadow: `0 0 0 1px rgba(255,255,255,0.85), 0 0 18px rgba(255,255,255,0.55), 0 0 30px -6px rgba(${cat.rgb},0.75)`,
                        }
                      : {
                          boxShadow: `0 0 0 1px rgba(255,255,255,0.45), 0 0 14px -1px rgba(255,255,255,0.40)`,
                        }
                  }
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: `rgb(${cat.rgb})`, boxShadow: `0 0 10px rgba(${cat.rgb},0.9)` }}
                  />
                  {cat.title}
                  {cat.products?.length ? (
                    <span className="ml-1 rounded-full bg-black/40 px-1.5 text-[10px] text-white/70">
                      {cat.products.length}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <ChapterPill
            editId={`shop.cat.${c.slug}.eyebrow`}
            defaultValue={`category / ${c.slug.replace(/-/g, " ")}`}
            accent={(c.accent as "violet" | "amber" | "cyan") || "violet"}
            size="md"
          />
          <KineticText
            as="h1"
            text={c.title}
            editId={`shop.cat.${c.slug}.heading`}
            className="editorial-display mt-4 max-w-3xl text-balance uppercase text-white text-[clamp(1.7rem,4vw,2.8rem)]"
            style={{
              textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          />
          <EditableText
            id={`shop.cat.${c.slug}.tagline.long`}
            defaultValue={c.tagline}
            as="p"
            multiline
            className="mt-4 max-w-2xl text-base leading-[1.7] text-white/85"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
          />
          <EditableText
            id={`shop.cat.${c.slug}.longDescription`}
            defaultValue={c.longDescription}
            as="p"
            multiline
            className="mt-3 max-w-2xl text-sm leading-[1.7] text-white/65"
          />
        </div>
      </section>
    );
  }
