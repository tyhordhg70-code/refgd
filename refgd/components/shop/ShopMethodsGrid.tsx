"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import EditableImage from "@/components/EditableImage";
import EditableText from "@/components/EditableText";

import type { ShopCategory as Category } from "@/lib/shop-catalog";

/**
 * ShopMethodsGrid — category card grid.
 *
 * Billgang-parity cards: white panel, full uncropped illustration, title and
 * description below — rendered on a clean white card over the light liquid
 * particles background.
 *
 * Entrance is a simple 2D fade + slide-up staggered by index. No 3D transforms
 * (perspective / preserve-3d / rotateX) — those promote each card to its own 3D
 * compositor layer that the browser mis-paints during Lenis smooth scrolling.
 */
export default function ShopMethodsGrid({ categories }: { categories: Category[] }) {
  const reduced = useReducedMotion();

  /**
   * Per-card entrance motion.
   *
   * MOUNT-driven fade + slide (`animate`, not `whileInView`) on every
   * viewport. A scroll-reveal here kept stranding the cards static: after
   * client navigation the cards were already in view at mount, so the
   * IntersectionObserver never refired and the entrance never played — the
   * "category boxes no longer animate" report. Mount-based animation always
   * plays the entrance and can never leave a card stuck at opacity:0.
   */
  const cardMotion = (i: number) => {
    if (reduced) return { initial: false as const };
    return {
      initial: { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, delay: 0.04 + i * 0.07, ease: [0.22, 1, 0.36, 1] as const },
    };
  };

  return (
    <section id="categories" className="relative z-10 py-16 sm:py-24 overflow-x-clip">
      <div className="container-wide relative">
        <EditableText
          id="shop.grid.eyebrow"
          defaultValue="OUR PRODUCTS"
          as="div"
          className="text-center text-xs font-bold uppercase tracking-[0.32em] text-violet-700 txt-on-light"
        />
        <EditableText
          id="shop.grid.title"
          defaultValue="Pick a category."
          as="h2"
          className="editorial-display mx-auto mt-4 max-w-3xl text-balance text-center uppercase text-gray-900 text-[clamp(1.8rem,4.5vw,3.4rem)] txt-on-light"
          style={{ letterSpacing: "-0.025em", lineHeight: 1.15 }}
        />
        <EditableText
          id="shop.grid.subtitle"
          defaultValue="A wide range of products organized into carefully curated categories. Pick the one you're interested in — each opens into the full product list."
          as="p"
          multiline
          className="mx-auto mt-5 max-w-2xl text-center text-base leading-[1.7] text-gray-800 txt-on-light"
        />

        {/* Category cards — big full illustration + title + description (Billgang layout) */}
        <div className="relative mt-12 grid gap-6 sm:gap-8 lg:grid-cols-2">
          {categories.map((c, i) => (
            <motion.div
              key={c.slug}
              {...cardMotion(i)}
              className="group"
            >
              <Link
                href={`/shop-methods/${c.slug}`}
                className="block h-full"
                aria-label={`View ${c.title}`}
              >
                <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10),0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-violet-200 group-hover:shadow-[0_16px_48px_-12px_rgba(109,40,217,0.15),0_4px_12px_-4px_rgba(0,0,0,0.08)]">
                  {/* Big, full (uncropped) illustration */}
                  <div className="w-full overflow-hidden bg-gray-50">
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
                      className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl"
                    />
                    <EditableText
                      id={`shop.cat.${c.slug}.tagline`}
                      defaultValue={c.tagline}
                      as="p"
                      multiline
                      className="mt-2 flex-1 text-sm leading-[1.7] text-gray-700 sm:text-base"
                    />
                    <span className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-bold uppercase tracking-[0.14em] text-red-600">
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
