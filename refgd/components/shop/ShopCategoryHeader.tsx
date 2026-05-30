"use client";

  import Link from "next/link";
  import EditableText from "@/components/EditableText";
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
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            <span aria-hidden>←</span> All Categories
          </Link>

          <div className="mt-1">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-violet-300/70 bg-violet-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-violet-700 sm:text-xs"
              style={{ boxShadow: `0 0 24px -10px rgba(${c.rgb},0.45)` }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: `rgb(${c.rgb})` }}
              />
              <EditableText
                id={`shop.cat.${c.slug}.eyebrow`}
                defaultValue={`category / ${c.slug.replace(/-/g, " ")}`}
                as="span"
              />
            </span>
          </div>
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
