"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import EditableImage from "@/components/EditableImage";
import EditableText from "@/components/EditableText";

import type { ShopCategory as Category } from "@/lib/shop-catalog";

/**
 * ShopMethodsGrid — category card grid.
 *
 * Billgang-parity cards: a LARGE, full (uncropped) illustration on a light
 * panel, then the category title and a short description below — rendered on a
 * white card so the mirrored Billgang illustrations read exactly like the
 * source store. Only the cards are light; they sit on the dark shop page.
 *
 * Entrance is a simple 2D fade + slide-up staggered by index. No 3D transforms
 * (perspective / preserve-3d / rotateX) — those promote each card to its own 3D
 * compositor layer that the browser mis-paints during Lenis smooth scrolling,
 * which previously made cards "break in half / vanish on scroll".
 */
export default function ShopMethodsGrid({ categories }: { categories: Category[] }) {
  const reduced = useReducedMotion();

  return (
    <section className="relative z-10 py-16 sm:py-24 overflow-x-clip">
      <div className="container-wide relative">
        <EditableText
          id="shop.grid.eyebrow"
          defaultValue="OUR PRODUCTS"
          as="div"
          className="text-center text-xs font-bold uppercase tracking-[0.32em] text-violet-300"
        />
        <EditableText
          id="shop.grid.title"
          defaultValue="Pick a category."
          as="h2"
          className="editorial-display mx-auto mt-4 max-w-3xl text-balance text-center uppercase text-white text-[clamp(1.8rem,4.5vw,3.4rem)]"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.15 }}
        />
        <EditableText
          id="shop.grid.subtitle"
          defaultValue="A wide range of products organized into carefully curated categories. Pick the one you're interested in — each opens into the full product list."
          as="p"
          multiline
          className="mx-auto mt-5 max-w-2xl text-center text-base leading-[1.7] text-white/75"
        />

        {/* Category cards — big full illustration + title + description (Billgang layout) */}
        <div className="relative mt-12 grid gap-6 sm:gap-8 lg:grid-cols-2">
          {categories.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={reduced ? {} : { opacity: 0, y: 48 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.8, delay: 0.06 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group"
            >
              <Link
                href={`/shop-methods/${c.slug}`}
                className="block h-full"
                aria-label={`View ${c.title}`}
              >
                <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#17171c] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/20">
                  {/* Big, full (uncropped) illustration —
                      object-contain so the whole artwork shows (never zoomed/cropped). */}
                  <div className="w-full overflow-hidden bg-[#0f0f14]">
                    <EditableImage
                      id={`shop.cat.${c.slug}.image`}
                      defaultSrc={c.image}
                      alt={c.title}
                      eager
                      wrapperClassName="block w-full"
                      className="block aspect-[16/10] w-full object-contain p-4 transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-6 sm:p-8">
                    <EditableText
                      id={`shop.cat.${c.slug}.title`}
                      defaultValue={c.title}
                      as="h3"
                      className="text-xl font-extrabold tracking-tight text-white sm:text-2xl"
                    />
                    <EditableText
                      id={`shop.cat.${c.slug}.tagline`}
                      defaultValue={c.tagline}
                      as="p"
                      multiline
                      className="mt-2 flex-1 text-sm leading-[1.7] text-slate-300 sm:text-base"
                    />
                    <span className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-bold uppercase tracking-[0.14em] text-red-400">
                      View products
                      <span
                        aria-hidden
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
