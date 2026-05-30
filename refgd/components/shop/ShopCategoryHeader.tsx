"use client";

  import Link from "next/link";
  import EditableText from "@/components/EditableText";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";

  import type { ShopCategory as Category } from "@/lib/shop-catalog";

  /**
   * ShopCategoryHeader — compact header for /shop-methods/[slug].
   * Light-background version: dark text, gray breadcrumb, dark title.
   */
  export default function ShopCategoryHeader({
    category: c,
  }: { category: Category }) {
    return (
      <section className="relative z-10 overflow-x-clip pb-4 pt-8 sm:pb-6 sm:pt-12">
        <div className="container-wide relative">
          <Link
            href="/shop-methods#categories"
            className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400 transition hover:text-gray-700"
          >
            <span aria-hidden>←</span> All Categories
          </Link>

          <ChapterPill
            editId={`shop.cat.${c.slug}.eyebrow`}
            defaultValue={`category / ${c.slug.replace(/-/g, " ")}`}
            accent="violet"
            size="md"
          />
          <KineticText
            as="h1"
            text={c.title}
            editId={`shop.cat.${c.slug}.heading`}
            className="editorial-display mt-4 max-w-3xl text-balance uppercase text-gray-900 text-[clamp(1.7rem,4vw,2.8rem)]"
            style={{
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          />
          <div
            className="mt-6 max-w-2xl border-l-2 pl-5"
            style={{ borderColor: `rgba(${c.rgb},0.6)` }}
          >
            <EditableText
              id={`shop.cat.${c.slug}.tagline.long`}
              defaultValue={c.tagline}
              as="p"
              multiline
              className="text-lg leading-[1.75] text-gray-800 sm:text-xl"
            />
            <EditableText
              id={`shop.cat.${c.slug}.longDescription`}
              defaultValue={c.longDescription}
              as="p"
              multiline
              className="mt-4 text-base leading-[1.8] text-gray-500"
            />
          </div>
        </div>
      </section>
    );
  }
