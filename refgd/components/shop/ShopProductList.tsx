"use client";

  import { useState } from "react";
  import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import EditableImage from "@/components/EditableImage";
  import ShopMarkdown from "@/components/shop/ShopMarkdown";

  type Product = {
    id: string;
    title: string;
    price: number;
    currency?: string;
    image?: string;
    summary?: string;
    description: string;
    chargeType?: string;
    customFields?: { name: string; required: boolean; placeholder?: string; defaultValue?: string; type?: string }[];
    sourceUrl?: string;
  };

  type Category = {
    slug: string;
    rgb: string;
    products: Product[];
  };

  type CheckoutState =
    | { phase: "idle" }
    | { phase: "loading" }
    | { phase: "ready"; url: string; orderId: string }
    | { phase: "error"; message: string };

  /**
   * ShopProductList — list of products inside one category.
   *
   * Phase 2: "Buy Now" expands the card; the expanded panel renders the full
   * markdown description, the product's checkout custom-fields (e.g.
   * "Which store?"), and a Pay-with-Crypto button. Pay click POSTs to
   * /api/checkout, which mints a NowPayments invoice — we then embed
   * `invoice_url` in an iframe so the buyer pays without leaving refgd.
   */
  export default function ShopProductList({ category: c }: { category: Category }) {
    const reduced = useReducedMotion();
    const [openId, setOpenId] = useState<string | null>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
    const [emailById, setEmailById] = useState<Record<string, string>>({});
    const [checkoutById, setCheckoutById] = useState<Record<string, CheckoutState>>({});

    const setFieldVal = (pid: string, name: string, val: string) =>
      setFieldValues((s) => ({ ...s, [pid]: { ...(s[pid] ?? {}), [name]: val } }));

    const startCheckout = async (p: Product) => {
      setCheckoutById((s) => ({ ...s, [p.id]: { phase: "loading" } }));
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: p.id,
            customFields: fieldValues[p.id] ?? {},
            email: emailById[p.id],
          }),
        });
        const data = (await res.json()) as { ok: boolean; invoiceUrl?: string; orderId?: string; error?: string };
        if (!res.ok || !data.ok || !data.invoiceUrl) {
          setCheckoutById((s) => ({
            ...s,
            [p.id]: { phase: "error", message: data.error ?? `Checkout failed (${res.status})` },
          }));
          return;
        }
        setCheckoutById((s) => ({
          ...s,
          [p.id]: { phase: "ready", url: data.invoiceUrl!, orderId: data.orderId ?? "" },
        }));
      } catch (e) {
        setCheckoutById((s) => ({ ...s, [p.id]: { phase: "error", message: String(e) } }));
      }
    };

    const resetCheckout = (pid: string) =>
      setCheckoutById((s) => ({ ...s, [pid]: { phase: "idle" } }));

    return (
      <section className="relative z-10 pb-16">
        <div className="container-wide relative" style={{ perspective: 1200 }}>
          <div className="grid gap-6 md:grid-cols-2">
            {c.products.map((p, i) => {
              const isOpen = openId === p.id;
              const priceLabel = `$${p.price}${p.currency && p.currency !== "USD" ? " " + p.currency : ""}`;
              const checkout: CheckoutState = checkoutById[p.id] ?? { phase: "idle" };
              const missingRequired = (p.customFields ?? []).some(
                (cf) => cf.required && !fieldValues[p.id]?.[cf.name]?.trim(),
              );

              return (
                <motion.article
                  key={p.id}
                  initial={reduced ? {} : { opacity: 0, y: 50, rotateX: 14, scale: 0.94 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.85, delay: 0.08 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
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
                    <div className="flex flex-wrap items-start gap-5">
                      {p.image && (
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/15"
                          style={{ boxShadow: `0 0 30px -10px rgba(${c.rgb},0.55)` }}>
                          <EditableImage
                            id={`shop.prod.${p.id}.image`}
                            defaultSrc={p.image}
                            alt={p.title}
                            wrapperClassName="block h-full w-full"
                            className="block h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <EditableText
                            id={`shop.prod.${p.id}.title`}
                            defaultValue={p.title}
                            as="h3"
                            className="editorial-display text-lg uppercase text-white sm:text-xl"
                            style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
                          />
                          <div
                            className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-bold text-white shrink-0"
                            style={{ boxShadow: `0 0 30px -10px rgba(${c.rgb},0.7)` }}
                          >
                            <EditableText
                              id={`shop.prod.${p.id}.price`}
                              defaultValue={priceLabel}
                              as="span"
                            />
                          </div>
                        </div>
                        {p.summary && (
                          <EditableText
                            id={`shop.prod.${p.id}.summary`}
                            defaultValue={p.summary}
                            as="p"
                            multiline
                            className="mt-2 text-sm leading-[1.6] text-white/70"
                          />
                        )}
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
                          <div className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-white/50">
                            What's included
                          </div>
                          <ShopMarkdown source={p.description} className="text-sm" />

                          {/* Checkout block */}
                          <div className="mt-7 rounded-2xl border border-white/15 bg-black/30 p-5">
                            <div className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-white/60">
                              Checkout · Pay with crypto
                            </div>

                            {checkout.phase === "ready" ? (
                              <div>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-white/60">
                                  <span>Order {checkout.orderId}</span>
                                  <button
                                    type="button"
                                    onClick={() => resetCheckout(p.id)}
                                    className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/10"
                                  >
                                    Start over
                                  </button>
                                </div>
                                <iframe
                                  src={checkout.url}
                                  title={`NowPayments checkout for ${p.title}`}
                                  className="block h-[720px] w-full rounded-xl border border-white/10 bg-white"
                                  allow="payment *; clipboard-write"
                                  referrerPolicy="no-referrer"
                                />
                                <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-white/45">
                                  Having trouble? <a className="text-amber-300 underline" href={checkout.url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
                                </p>
                              </div>
                            ) : (
                              <>
                                {p.customFields && p.customFields.length > 0 && (
                                  <div className="mb-4 space-y-3">
                                    {p.customFields.map((cf) => (
                                      <label key={cf.name} className="block">
                                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                                          {cf.name}
                                          {cf.required && <span className="ml-1 text-amber-300">*</span>}
                                        </span>
                                        <input
                                          type="text"
                                          placeholder={cf.placeholder || cf.defaultValue || ""}
                                          value={fieldValues[p.id]?.[cf.name] ?? ""}
                                          onChange={(e) => setFieldVal(p.id, cf.name, e.target.value)}
                                          className="block w-full rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
                                        />
                                      </label>
                                    ))}
                                  </div>
                                )}
                                <label className="mb-4 block">
                                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                                    Email <span className="text-white/40 normal-case">(optional, for receipt)</span>
                                  </span>
                                  <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={emailById[p.id] ?? ""}
                                    onChange={(e) => setEmailById((s) => ({ ...s, [p.id]: e.target.value }))}
                                    className="block w-full rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
                                  />
                                </label>

                                <button
                                  type="button"
                                  disabled={checkout.phase === "loading" || missingRequired}
                                  onClick={() => startCheckout(p)}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                                  style={{ boxShadow: `0 0 36px -8px rgba(${c.rgb},0.7)` }}
                                >
                                  {checkout.phase === "loading"
                                    ? "Creating invoice…"
                                    : missingRequired
                                    ? "Fill required fields"
                                    : `Pay ${priceLabel} with crypto →`}
                                </button>

                                {checkout.phase === "error" && (
                                  <p className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                                    {checkout.message}
                                  </p>
                                )}
                              </>
                            )}
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
  