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
  }: { category: Category }) {
    return (
      <section className="relative z-10 overflow-x-clip pb-4 pt-8 sm:pb-6 sm:pt-12">
        <div className="container-wide relative">
          <Link
            href="/shop-methods"
            className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/60 transition hover:text-white"
          >
            <span aria-hidden>←</span> All Categories
          </Link>

          <ChapterPill
            editId={`shop.cat.${c.slug}.eyebrow`}
            defaultValue={`category / ${c.slug.replace(/-/g, " ")}`}
            accent="white"
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
          <div
            className="mt-6 max-w-2xl border-l-2 pl-5"
            style={{ borderColor: `rgba(${c.rgb},0.55)` }}
          >
            <EditableText
              id={`shop.cat.${c.slug}.tagline.long`}
              defaultValue={c.tagline}
              as="p"
              multiline
              className="text-lg leading-[1.75] text-white/95 sm:text-xl"
              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}
            />
            <EditableText
              id={`shop.cat.${c.slug}.longDescription`}
              defaultValue={c.longDescription}
              as="p"
              multiline
              className="mt-4 text-base leading-[1.8] text-white/80"
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.55)" }}
            />
          </div>
        </div>
      </section>
    );
  }
