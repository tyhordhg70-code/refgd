"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import EditableImage from "@/components/EditableImage";
import EditableText from "@/components/EditableText";
import { useVouchesOpen } from "@/components/shop/ShopVouchesModal";

import type { ShopCategory as Category } from "@/lib/shop-catalog";

/**
 * ShopMethodsGrid — category card grid.
 *
 * Cards float continuously (gentle y-bob, staggered per card).
 * On first visit the image slides in from above and the text from below.
 * On return visits (back-navigation) cards skip the entrance and start
 * floating immediately, so cached images appear without any flash.
 */
export default function ShopMethodsGrid({ categories }: { categories: Category[] }) {
  const reduced = useReducedMotion();
  const frozen = useVouchesOpen();

  /**
   * Detect return visits via sessionStorage so back-navigation skips the
   * entrance animation (cards appear instantly with cached images).
   */
  const [returnVisit] = useState<boolean>(() => {
    if (typeof sessionStorage === "undefined") return false;
    const seen = sessionStorage.getItem("shop.grid.visited") === "1";
    sessionStorage.setItem("shop.grid.visited", "1");
    return seen;
  });

  const skip = reduced || returnVisit;

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

        {/* Category cards */}
        <div className="relative mt-12 grid gap-6 sm:gap-8 lg:grid-cols-2">
          {categories.map((c, i) => (
            /* Outer: entrance fade+slide on first visit */
            <motion.div
              key={c.slug}
              className={`group${
                i === categories.length - 1 && categories.length % 2 === 1
                  ? " lg:col-span-2 lg:mx-auto lg:w-[calc(50%_-_1rem)]"
                  : ""
              }`}
              initial={skip ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={skip ? undefined : {
                duration: 0.6,
                delay: 0.06 + i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Inner: continuous gentle float — each card offset so they don't bob in sync */}
              <motion.div
                animate={reduced || frozen ? { y: 0 } : { y: [0, -10, 0] }}
                transition={
                  reduced || frozen
                    ? { duration: 0.4 }
                    : {
                        duration: 4.2 + i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.7 + (skip ? 0 : 0.6),
                      }
                }
              >
                <Link
                  href={`/shop-methods/${c.slug}`}
                  className="block h-full"
                  aria-label={`View ${c.title}`}
                >
                  <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_12px_40px_-10px_rgba(0,0,0,0.13),0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] duration-300 group-hover:border-violet-200 group-hover:shadow-[0_20px_56px_-10px_rgba(109,40,217,0.18),0_4px_12px_-4px_rgba(0,0,0,0.08)]">

                    {/* Image — slides down from above on first visit */}
                    <motion.div
                      className="w-full overflow-hidden bg-white"
                      initial={skip ? false : { opacity: 0, y: -14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={skip ? undefined : {
                        duration: 0.55,
                        delay: 0.14 + i * 0.1,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <EditableImage
                        id={`shop.cat.${c.slug}.image`}
                        defaultSrc={c.image}
                        alt={c.title}
                        eager
                        wrapperClassName="block w-full"
                        className="block aspect-[16/10] w-full object-contain p-4 transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </motion.div>

                    {/* Body — slides up from below on first visit */}
                    <motion.div
                      className="flex flex-1 flex-col p-6 sm:p-8"
                      initial={skip ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={skip ? undefined : {
                        duration: 0.55,
                        delay: 0.24 + i * 0.1,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
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
                    </motion.div>

                  </div>
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
