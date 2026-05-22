"use client";

  import { useState } from "react";
  import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";

  type Product = {
    id: string;
    title: string;
    price: number;
    summary: string;
    description: string;
  };

  type Category = {
    slug: string;
    rgb: string;
    products: Product[];
  };

  /**
   * ShopProductList — list of products inside one category.
   *
   * Phase 1A: each card expands inline (Buy Now → full description below).
   * Phase 2 will add NowPayments.io widget INSIDE the expanded panel so
   * checkout happens on-page (no redirect).
   *
   * 3D scroll-aware entrance: cards rise + scale + slight rotateX, staggered.
   * once:true so no glitches when scrolling back up.
   */
  export default function ShopProductList({ category: c }: { category: Category }) {
    const reduced = useReducedMotion();
    const [openId, setOpenId] = useState<string | null>(null);

    return (
      <section className="relative z-10 pb-16">
        <div className="container-wide relative" style={{ perspective: 1200 }}>
          <div className="grid gap-6 md:grid-cols-2">
            {c.products.map((p, i) => {
              const isOpen = openId === p.id;
              return (
                <motion.article
                  key={p.id}
                  initial={reduced ? {} : { opacity: 0, y: 50, rotateX: 14, scale: 0.94 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.85, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="relative overflow-hidden rounded-[1.5rem] border border-white/15"
                  style={{
                    background: `linear-gradient(165deg, rgba(${c.rgb},0.18), rgba(10,8,22,0.94) 60%)`,
                    boxShadow: `0 30px 80px -25px rgba(0,0,0,0.85), 0 0 60px -25px rgba(${c.rgb},0.45), inset 0 1px 0 rgba(255,255,255,0.06)`,
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                  <div className="relative p-6 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <EditableText
                          id={`shop.prod.${p.id}.title`}
                          defaultValue={p.title}
                          as="h3"
                          className="editorial-display text-lg uppercase text-white sm:text-xl"
                          style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
                        />
                        <EditableText
                          id={`shop.prod.${p.id}.summary`}
                          defaultValue={p.summary}
                          as="p"
                          multiline
                          className="mt-2 text-sm leading-[1.6] text-white/70"
                        />
                      </div>
                      <div
                        className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-bold text-white"
                        style={{ boxShadow: `0 0 30px -10px rgba(${c.rgb},0.7)` }}
                      >
                        <EditableText
                          id={`shop.prod.${p.id}.price`}
                          defaultValue={`$${p.price}`}
                          as="span"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : p.id)}
                      aria-expanded={isOpen}
                      aria-controls={`prod-panel-${p.id}`}
                      className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                      style={{ boxShadow: `0 0 32px -8px rgba(${c.rgb},0.65)` }}
                    >
                      {isOpen ? "Hide details" : "Buy Now"}
                      <span aria-hidden className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>↓</span>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="panel"
                        id={`prod-panel-${p.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-white/10"
                      >
                        <div className="p-6 sm:p-7">
                          <div className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-white/50">
                            Full description
                          </div>
                          <EditableText
                            id={`shop.prod.${p.id}.description`}
                            defaultValue={p.description}
                            as="div"
                            multiline
                            className="text-sm leading-[1.75] text-white/85 whitespace-pre-wrap"
                          />

                          {/* Phase 2 anchor — NowPayments.io widget will mount here */}
                          <div
                            className="mt-6 rounded-2xl border border-dashed border-white/20 bg-black/30 p-5 text-center text-xs uppercase tracking-[0.2em] text-white/50"
                            aria-label="Payment widget placeholder"
                          >
                            Checkout (NowPayments widget) — phase 2
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
  