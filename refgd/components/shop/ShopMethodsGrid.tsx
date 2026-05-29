"use client";

import Image from "next/image";
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
 *   • Floating semi-transparent crypto illustration above the grid.
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

        {/* Floating transparent hero illustration, sitting ABOVE the category
            cards. Background removed (transparent PNG) so it blends cleanly;
            entrance fade-up + perpetual gentle float. */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 40, scale: 0.94 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none relative mx-auto mt-12 max-w-xl select-none"
          aria-hidden="true"
        >
          <motion.div
            animate={reduced ? {} : {
              y: [0, -18, 0],
              scale: [1, 1.03, 1],
              opacity: [0.72, 0.92, 0.72],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            style={{
              filter: "drop-shadow(0 26px 60px rgba(124,58,237,0.45)) saturate(1.15)",
            }}
          >
            <Image
              src="/shop-images/crypto-academy.png"
              alt=""
              width={740}
              height={493}
              className="w-full"
              unoptimized
            />
          </motion.div>
        </motion.div>

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
                    className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/15 transition-all duration-500 group-hover:scale-[1.02] group-hover:border-white/30"
                    style={{
                      background: `linear-gradient(165deg, rgba(${c.rgb},0.20) 0%, rgba(10,8,22,0.94) 60%)`,
                    }}
                  >
                    {/* Image plate — white background, generous padding so the
                        category artwork isn't over-cropped (keeps the zoom fix). */}
                    <div className="relative h-56 w-full overflow-hidden bg-white">
                      <EditableImage
                        id={`shop.cat.${c.slug}.image`}
                        defaultSrc={c.image}
                        alt={c.title}
                        wrapperClassName="block h-full w-full"
                        className="block h-full w-full object-contain p-8 transition-transform duration-700 group-hover:scale-[1.04]"
                      />

                      {/* Count + price chips */}
                      {count > 0 && (
                        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                            {countLabel}
                          </span>
                          {priceLabel && (
                            <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                              {priceLabel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative flex flex-1 flex-col p-6 sm:p-7">
                      <EditableText
                        id={`shop.cat.${c.slug}.title`}
                        defaultValue={c.title}
                        as="h3"
                        className="editorial-display text-xl uppercase text-white sm:text-2xl"
                        style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
                      />
                      <EditableText
                        id={`shop.cat.${c.slug}.tagline`}
                        defaultValue={c.tagline}
                        as="p"
                        multiline
                        className="mt-3 flex-1 text-sm leading-[1.65] text-white/70"
                      />

                      <div
                        className="mt-6 inline-flex items-center gap-2 self-start rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-all duration-300 group-hover:brightness-125"
                        style={{
                          background: `linear-gradient(135deg, rgba(${c.rgb},0.22) 0%, rgba(${c.rgb},0.08) 100%)`,
                          border: `1px solid rgba(${c.rgb},0.38)`,
                          boxShadow: `0 0 28px -8px rgba(${c.rgb},0.62), inset 0 1px 0 rgba(255,255,255,0.08)`,
                        }}
                      >
                        View products
                        <span
                          aria-hidden
                          className="transition-transform duration-300 group-hover:translate-x-1"
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
