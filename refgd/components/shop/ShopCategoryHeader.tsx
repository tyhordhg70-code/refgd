"use client";

  import Link from "next/link";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableImage from "@/components/EditableImage";
  import EditableText from "@/components/EditableText";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";

  type Category = {
    slug: string;
    title: string;
    tagline: string;
    image: string;
    accent: string;
    rgb: string;
    longDescription: string;
    products?: { price: number }[];
  };

  /**
   * ShopCategoryHeader — header for /shop-methods/[slug].
   *   • Breadcrumb back to /shop-methods
   *   • Category quick-switcher chip row (one chip per category) so users can
   *     hop between groups without scrolling back — matches the Billgang tab feel.
   *   • Split layout: text left, category image right
   *   • Spring scale-in on image, clip-path wipe on text panel
   */
  export default function ShopCategoryHeader({
    category: c,
    allCategories,
  }: { category: Category; allCategories: Category[] }) {
    const reduced = useReducedMotion();

    return (
      <section className="relative z-10 pt-12 pb-10 sm:pt-20 sm:pb-14">
        <div className="container-wide relative">
          <Link
            href="/shop-methods"
            className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/60 transition hover:text-white"
          >
            <span aria-hidden>←</span> All Categories
          </Link>

          {/* Quick-switcher chip row */}
          <nav
            aria-label="Categories"
            className="mb-8 flex flex-wrap gap-2"
          >
            {allCategories.map((cat) => {
              const active = cat.slug === c.slug;
              return (
                <Link
                  key={cat.slug}
                  href={`/shop-methods/${cat.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`group inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    active
                      ? "border-white/50 bg-white/15 text-white"
                      : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/35 hover:bg-white/10 hover:text-white"
                  }`}
                  style={
                    active
                      ? { boxShadow: `0 0 28px -6px rgba(${cat.rgb},0.7)` }
                      : undefined
                  }
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: `rgb(${cat.rgb})`, boxShadow: `0 0 10px rgba(${cat.rgb},0.9)` }}
                  />
                  {cat.title}
                  {cat.products?.length ? (
                    <span className="ml-1 rounded-full bg-black/40 px-1.5 text-[10px] text-white/70">
                      {cat.products.length}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <motion.div
            initial={reduced ? {} : { clipPath: "inset(100% 0 0 0 round 2rem)", opacity: 0 }}
            whileInView={reduced ? undefined : { clipPath: "inset(0% 0 0 0 round 2rem)", opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
            className="relative rounded-[2rem] border border-white/15 px-6 py-10 sm:p-12 lg:p-14"
            style={{
              background: `linear-gradient(160deg, rgba(${c.rgb},0.16), rgba(34,211,238,0.06) 50%, rgba(10,8,22,0.94))`,
              boxShadow: `0 60px 140px -30px rgba(0,0,0,0.85), 0 0 90px -25px rgba(${c.rgb},0.45), inset 0 1px 0 rgba(255,255,255,0.08)`,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
              style={{ background: `radial-gradient(circle, rgba(${c.rgb},0.30), transparent 70%)`, filter: "blur(24px)" }} />
            <span aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(34,211,238,0.22), transparent 70%)", filter: "blur(24px)" }} />

            <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14">
              <div>
                <ChapterPill
                  editId={`shop.cat.${c.slug}.eyebrow`}
                  defaultValue={`category / ${c.slug.replace(/-/g, " ")}`}
                  accent={(c.accent as "violet" | "amber" | "cyan") || "violet"}
                  size="md"
                />
                <KineticText
                  as="h1"
                  text={c.title}
                  editId={`shop.cat.${c.slug}.heading`}
                  className="editorial-display mt-6 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5.2vw,3.8rem)]"
                  style={{
                    textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                    letterSpacing: "-0.025em",
                    lineHeight: 1.15,
                  }}
                />
                <EditableText
                  id={`shop.cat.${c.slug}.tagline.long`}
                  defaultValue={c.tagline}
                  as="p"
                  multiline
                  className="mt-5 max-w-xl text-base leading-[1.7] text-white/85 sm:text-lg"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                />
                <EditableText
                  id={`shop.cat.${c.slug}.longDescription`}
                  defaultValue={c.longDescription}
                  as="p"
                  multiline
                  className="mt-4 max-w-xl text-sm leading-[1.7] text-white/65"
                />
              </div>

              <motion.div
                initial={reduced ? {} : { scale: 0.4, rotate: -12, opacity: 0, filter: "blur(10px)" }}
                whileInView={reduced ? undefined : { scale: 1, rotate: 0, opacity: 1, filter: "blur(0px)" }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ type: "spring", stiffness: 78, damping: 14, delay: 0.45 }}
                className="relative mx-auto block w-full max-w-[360px] sm:max-w-[420px]"
              >
                <span aria-hidden className="pointer-events-none absolute inset-x-6 -bottom-2 h-8 rounded-[100%]"
                  style={{ background: `radial-gradient(ellipse 60% 100% at 50% 0%, rgba(${c.rgb},0.55), transparent 70%)`, filter: "blur(14px)" }} />
                <EditableImage
                  id={`shop.cat.${c.slug}.image.large`}
                  defaultSrc={c.image}
                  alt={c.title}
                  wrapperClassName="relative z-10 block w-full"
                  className="block h-auto w-full rounded-2xl drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)]"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }
  