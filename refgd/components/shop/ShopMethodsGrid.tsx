"use client";

  import Link from "next/link";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableImage from "@/components/EditableImage";
  import EditableText from "@/components/EditableText";

  import type { ShopCategory as Category } from "@/lib/shop-catalog";

  /**
   * ShopMethodsGrid — 5 category cards, 3D fan entrance.
   *   • Each card has a different 3D angle for a fanned-out entrance.
   *   • Each card shows live count + price range so users know the catalog depth
   *     before clicking through to /shop-methods/[slug].
   *   • once:true prevents glitching on scroll-up.
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

          <div
            className="relative mt-12 sm:mt-14 grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7"
            style={{ perspective: 1400 }}
          >
            {categories.map((c, i) => {
              const initialRotateY = i === 0 ? -30 : i === 1 ? -15 : i === 2 ? 0 : i === 3 ? 15 : 30;
              const initialRotateX = i % 2 === 0 ? 12 : -10;

              const count = c.products?.length ?? 0;
              const prices = (c.products ?? []).map(p => p.price).filter((n): n is number => typeof n === "number");
              const min = prices.length ? Math.min(...prices) : 0;
              const max = prices.length ? Math.max(...prices) : 0;
              const priceLabel = !prices.length
                ? null
                : min === max ? `$${min}` : `$${min}–$${max}`;
              const countLabel = count === 1 ? "1 product" : `${count} products`;

              return (
                <motion.div
                  key={c.slug}
                  initial={reduced ? {} : { opacity: 0, y: 70, rotateY: initialRotateY, rotateX: initialRotateX, scale: 0.85 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0, rotateY: 0, rotateX: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.12, margin: "0px 0px -10% 0px" }}
                  transition={{ duration: 1.0, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Link href={`/shop-methods/${c.slug}`} className="block h-full" aria-label={`View ${c.title}`}>
                    <div
                      className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/15 transition-all duration-500 group-hover:scale-[1.02] group-hover:border-white/30"
                      style={{
                        background: `linear-gradient(165deg, rgba(${c.rgb},0.20), rgba(10,8,22,0.94) 60%)`,
                        boxShadow: `0 40px 100px -25px rgba(0,0,0,0.85), 0 0 80px -30px rgba(${c.rgb},0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                      }}
                    >
                      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                      <div className="relative h-56 w-full overflow-hidden">
                        <EditableImage
                          id={`shop.cat.${c.slug}.image`}
                          defaultSrc={c.image}
                          alt={c.title}
                          wrapperClassName="block h-full w-full"
                          className="block h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <span aria-hidden className="pointer-events-none absolute inset-0"
                          style={{ background: "linear-gradient(180deg, transparent 50%, rgba(10,8,22,0.85) 100%)" }} />

                        {/* count + price-range chip overlay */}
                        {count > 0 && (
                          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                            <span
                              className="rounded-full border border-white/25 bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md"
                              style={{ boxShadow: `0 0 20px -6px rgba(${c.rgb},0.6)` }}
                            >
                              {countLabel}
                            </span>
                            {priceLabel && (
                              <span
                                className="rounded-full border border-white/25 bg-black/55 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md"
                                style={{ boxShadow: `0 0 20px -6px rgba(${c.rgb},0.6)` }}
                              >
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
                          className="mt-3 flex-1 text-sm leading-[1.65] text-white/75"
                        />

                        <div className="mt-6 inline-flex items-center gap-2 self-start rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 group-hover:border-white/50 group-hover:bg-white/10"
                          style={{ boxShadow: `0 0 32px -8px rgba(${c.rgb},0.65)` }}>
                          View products
                          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
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
  