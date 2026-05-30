"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import EditableImage from "@/components/EditableImage";
import EditableText from "@/components/EditableText";

import type { ShopCategory as Category } from "@/lib/shop-catalog";

/**
 * ShopMethodsGrid — category card grid.
 *   • Unified entrance animation: all cards use the same simple 2D fade + slide-up,
 *     staggered by index. No 3D transforms (perspective / preserve-3d / rotateX) —
 *     those broke cards on smooth scroll (tearing / vanishing).
 *   • Layered radial-gradient card background: dual corner accent glows on a
 *     dark glass base — more depth than a flat directional gradient.
 *   • Dark image area with generous padding (p-9) so category images aren't
 *     over-cropped (fixes Refund/SE and Insert Aged Orders zoom complaints).
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

        {/* Category card grid */}
        <div
          className="relative mt-10 sm:mt-12 grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7"
        >
          {categories.map((c, i) => {
            const count = c.products?.length ?? 0;
            const prices = (c.products ?? [])
              .map((p) => p.price)
              .filter((n): n is number => typeof n === "number");
            const min = prices.length ? Math.min(...prices) : 0;
            const max = prices.length ? Math.max(...prices) : 0;
            const priceLabel = !prices.length
              ? null
              : min === max
              ? `$${min}`
              : `$${min}–$${max}`;
            const countLabel = count === 1 ? "1 product" : `${count} products`;

            return (
              <motion.div
                key={c.slug}
                /* All cards share the same simple 2D entrance (opacity + slide-up),
                   staggered by index. No 3D rotateX / preserve-3d / perspective —
                   those promote each card to a 3D compositor layer that the browser
                   mis-paints during smooth (Lenis) scrolling, which is what caused
                   the cards to "break in half / vanish on scroll". */
                initial={reduced ? {} : { opacity: 0, y: 48 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 0.8, delay: 0.06 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
              >
                <Link href={`/shop-methods/${c.slug}`} className="block h-full" aria-label={`View ${c.title}`}>
                  <div
                    className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0a1c]/85 backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/25"
                    style={{
                      boxShadow:
                        "0 24px 60px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Thin accent bar in the category colour */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 z-20 h-[3px]"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgb(${c.rgb}), transparent)`,
                        opacity: 0.75,
                      }}
                    />

                    {/* Image — object-contain so the full artwork shows (not zoomed/cropped) */}
                    <div
                      className="relative h-52 w-full overflow-hidden"
                      style={{
                        background: `radial-gradient(circle at 50% 30%, rgba(${c.rgb},0.16), rgba(8,6,18,0.92) 72%)`,
                      }}
                    >
                      <EditableImage
                        id={`shop.cat.${c.slug}.image`}
                        defaultSrc={c.image}
                        alt={c.title}
                        wrapperClassName="block h-full w-full"
                        className="block h-full w-full object-contain p-6 transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#0d0a1c]"
                      />
                    </div>

                    {/* Body */}
                    <div className="relative flex flex-1 flex-col p-6">
                      {/* eyebrow: count + price */}
                      <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        <span className="inline-flex items-center gap-1.5 text-white/55">
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background: `rgb(${c.rgb})`,
                              boxShadow: `0 0 10px rgba(${c.rgb},0.9)`,
                            }}
                          />
                          {countLabel}
                        </span>
                        {priceLabel && (
                          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-white/80">
                            {priceLabel}
                          </span>
                        )}
                      </div>

                      <EditableText
                        id={`shop.cat.${c.slug}.title`}
                        defaultValue={c.title}
                        as="h3"
                        className="editorial-display text-xl uppercase text-white sm:text-[1.6rem]"
                        style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
                      />
                      <EditableText
                        id={`shop.cat.${c.slug}.tagline`}
                        defaultValue={c.tagline}
                        as="p"
                        multiline
                        className="mt-3 flex-1 text-sm leading-[1.7] text-white/65"
                      />

                      {/* CTA: clean underline-arrow link */}
                      <div className="mt-6 inline-flex items-center gap-2 self-start text-xs font-bold uppercase tracking-[0.2em] text-white">
                        <span className="relative">
                          View products
                          <span
                            aria-hidden
                            className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-white/70 transition-transform duration-300 group-hover:scale-x-100"
                          />
                        </span>
                        <span
                          aria-hidden
                          className="transition-transform duration-300 group-hover:translate-x-1"
                          style={{ color: `rgb(${c.rgb})` }}
                        >
                          →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
