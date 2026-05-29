"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import EditableImage from "@/components/EditableImage";
import EditableText from "@/components/EditableText";

import type { ShopCategory as Category } from "@/lib/shop-catalog";

/**
 * ShopMethodsGrid — category card grid.
 *   • Unified entrance animation: all cards use the same rotateX sweep,
 *     staggered by index (per user request: "same animation as insert aged orders").
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

        {/* Floating transparent hero illustration above the grid.
            mix-blend-mode:screen makes the light areas glow into the dark page
            while dark areas vanish — creating an ethereal transparency effect. */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 28 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none relative mx-auto mt-10 max-w-xl select-none"
          aria-hidden="true"
        >
          <motion.div
            animate={reduced ? {} : {
              y: [0, -16, 0],
              scale: [1, 1.022, 1],
              opacity: [0.15, 0.21, 0.15],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/shop-images/crypto-academy.jpg"
              alt=""
              width={740}
              height={493}
              className="w-full"
              style={{
                mixBlendMode: "screen",
                filter: "saturate(1.7) brightness(1.2) hue-rotate(18deg)",
              }}
              unoptimized
            />
          </motion.div>
        </motion.div>

        {/* Category card grid */}
        <div
          className="relative mt-10 sm:mt-12 grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7"
          style={{ perspective: 1400 }}
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
                /* All cards use the same entrance animation (straight-on rotateX sweep,
                   no per-index rotateY variation), staggered by delay. */
                initial={reduced ? {} : { opacity: 0, y: 60, rotateX: 10, scale: 0.9 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.12, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 1.0, delay: 0.08 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                <Link href={`/shop-methods/${c.slug}`} className="block h-full" aria-label={`View ${c.title}`}>
                  <div
                    className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] transition-all duration-500 group-hover:scale-[1.025]"
                    style={{
                      /* Layered radial gradients: accent corner glows (top-right + bottom-left)
                         on a very dark indigo base — much more depth than a flat linear gradient. */
                      background: `
                        radial-gradient(ellipse 80% 55% at 96% 4%,  rgba(${c.rgb},0.26) 0%, transparent 62%),
                        radial-gradient(ellipse 55% 42% at 4%  96%, rgba(${c.rgb},0.12) 0%, transparent 58%),
                        radial-gradient(ellipse 40% 28% at 50% 50%, rgba(${c.rgb},0.05) 0%, transparent 68%),
                        linear-gradient(170deg, rgba(14,11,32,0.97) 0%, rgba(8,7,18,0.99) 100%)
                      `,
                      /* Colored outline via box-shadow (avoids Tailwind border opacity limits) */
                      boxShadow: `
                        0 44px 110px -28px rgba(0,0,0,0.92),
                        0 0 0 1.5px rgba(${c.rgb},0.24),
                        0 0 90px -32px rgba(${c.rgb},0.55),
                        inset 0 1px 0 rgba(255,255,255,0.10),
                        inset 0 -1px 0 rgba(${c.rgb},0.07)
                      `,
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                    }}
                  >
                    {/* Top accent shimmer */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, rgba(${c.rgb},0.65) 50%, transparent 100%)`,
                      }}
                    />

                    {/* Accent badge — accent-colour pill in top-left */}
                    <div className="absolute left-5 top-5 z-10 flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        aria-hidden
                        style={{
                          background: `rgb(${c.rgb})`,
                          boxShadow: `0 0 12px 3px rgba(${c.rgb},0.90)`,
                        }}
                      />
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.20em]"
                        style={{
                          border: `1px solid rgba(${c.rgb},0.38)`,
                          color: `rgb(${c.rgb})`,
                          background: `rgba(${c.rgb},0.10)`,
                          backdropFilter: "blur(8px)",
                          textShadow: `0 0 10px rgba(${c.rgb},0.8)`,
                        }}
                      >
                        {c.accent}
                      </span>
                    </div>

                    {/* Image area — dark gradient bg, extra padding (p-9) to reduce zoom */}
                    <div
                      className="relative h-56 w-full overflow-hidden"
                      style={{
                        background: `linear-gradient(180deg, rgba(${c.rgb},0.08) 0%, rgba(8,7,18,0.55) 100%)`,
                      }}
                    >
                      <EditableImage
                        id={`shop.cat.${c.slug}.image`}
                        defaultSrc={c.image}
                        alt={c.title}
                        wrapperClassName="block h-full w-full"
                        className="block h-full w-full object-contain p-9 transition-transform duration-700 group-hover:scale-[1.05]"
                      />

                      {/* Count + price chips */}
                      {count > 0 && (
                        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
                          <span
                            className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md"
                            style={{ boxShadow: `0 0 20px -6px rgba(${c.rgb},0.6)` }}
                          >
                            {countLabel}
                          </span>
                          {priceLabel && (
                            <span
                              className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md"
                              style={{ boxShadow: `0 0 20px -6px rgba(${c.rgb},0.6)` }}
                            >
                              {priceLabel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Accent divider */}
                    <span
                      aria-hidden
                      className="block h-px w-full"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, rgba(${c.rgb},0.32) 50%, transparent 100%)`,
                      }}
                    />

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
