"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import EditableText from "@/components/EditableText";
import KineticText from "@/components/KineticText";

import type { ShopCategory as Category } from "@/lib/shop-catalog";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * ShopCategoryHeader — compact header for /shop-methods/[slug].
 *
 * Every element animates in on mount so clicking a category feels like a
 * smooth intentional transition. Elements stagger down: breadcrumb → badge
 * → title → description — guiding the eye naturally through the hierarchy.
 */
export default function ShopCategoryHeader({ category: c }: { category: Category }) {
  const reduced = useReducedMotion();

  const fadeUp = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.5, delay, ease },
        };

  return (
    <section className="relative z-10 overflow-x-clip pb-4 pt-8 sm:pb-6 sm:pt-12">
      <div className="container-wide relative">

        <motion.div {...fadeUp(0.04)}>
          <Link
            href="/shop-methods#categories"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            <span aria-hidden>←</span> All Categories
          </Link>
        </motion.div>

        <motion.div className="mt-1" {...fadeUp(0.1)}>
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
        </motion.div>

        <motion.div {...fadeUp(0.18)}>
          <KineticText
            as="h1"
            text={c.title}
            editId={`shop.cat.${c.slug}.heading`}
            className="editorial-display mt-4 max-w-3xl text-balance uppercase text-gray-900 text-[clamp(1.7rem,4vw,2.8rem)] txt-on-light"
            style={{ letterSpacing: "-0.025em", lineHeight: 1.15 }}
          />
        </motion.div>

        <motion.div
          className="mt-6 max-w-2xl border-l-2 pl-5"
          style={{ borderColor: `rgba(${c.rgb},0.6)` }}
          {...fadeUp(0.26)}
        >
          <EditableText
            id={`shop.cat.${c.slug}.tagline.long`}
            defaultValue={c.tagline}
            as="p"
            multiline
            className="text-lg leading-[1.75] text-gray-800 txt-on-light sm:text-xl"
          />
          <EditableText
            id={`shop.cat.${c.slug}.longDescription`}
            defaultValue={c.longDescription}
            as="p"
            multiline
            className="mt-4 text-base leading-[1.8] text-gray-800 txt-on-light"
          />
        </motion.div>

      </div>
    </section>
  );
}
