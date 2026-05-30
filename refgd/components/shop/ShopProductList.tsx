"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import ShopMarkdown from "@/components/shop/ShopMarkdown";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

import type { ShopCategory as Category, ShopProduct as Product } from "@/lib/shop-catalog";

type CheckoutState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; url: string; orderId: string }
  | { phase: "error"; message: string };

/**
 * ShopProductList — product grid for one category.
 *
 * Clicking "View product" opens a full product detail popup (Billgang-style):
 * large product image on a clean white plate, the full markdown description,
 * the product's checkout custom-fields and a pay-with-crypto flow. Paying
 * POSTs to /api/checkout (mints a NowPayments invoice) and surfaces a secure
 * "Open payment page" link the buyer follows to complete payment (the invoice
 * page refuses iframe embedding, so we link out in a new tab instead).
 */
export default function ShopProductList({ category: c }: { category: Category }) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [emailById, setEmailById] = useState<Record<string, string>>({});
  const [channelById, setChannelById] = useState<Record<string, "email" | "telegram">>({});
  const [checkoutById, setCheckoutById] = useState<Record<string, CheckoutState>>({});

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!openId) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [openId]);

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
          channel: channelById[p.id] ?? "email",
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

  const openProduct = c.products.find((p) => p.id === openId) ?? null;

  return (
    <section className="relative z-10 overflow-x-clip pb-16">
      <div className="container-wide relative">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {c.products.map((p, i) => {
            const priceLabel = `$${p.price}${p.currency && p.currency !== "USD" ? " " + p.currency : ""}`;
            return (
              <motion.article
                key={p.id}
                initial={reduced ? {} : { opacity: 0, y: 24 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                whileHover={reduced ? undefined : { y: -4 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: 0.04 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10),0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-violet-200 hover:shadow-[0_16px_48px_-12px_rgba(109,40,217,0.14)]"
              >
                {p.image && (
                  <div className="relative w-full overflow-hidden rounded-t-[1.5rem] bg-gray-50 aspect-[4/3]">
                    <EditableImage
                      id={`shop.prod.${p.id}.image`}
                      defaultSrc={p.image}
                      alt={p.title}
                      eager
                      wrapperClassName="block h-full w-full absolute inset-0"
                      className="block h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <EditableText
                      id={`shop.prod.${p.id}.title`}
                      defaultValue={p.title}
                      as="h3"
                      className="editorial-display min-w-0 break-words text-base uppercase text-gray-900 sm:text-lg"
                      style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
                    />
                    <span className="shrink-0 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-sm font-bold text-gray-800">
                      <EditableText id={`shop.prod.${p.id}.price`} defaultValue={priceLabel} as="span" />
                    </span>
                  </div>

                  {p.summary && (
                    <EditableText
                      id={`shop.prod.${p.id}.summary`}
                      defaultValue={p.summary}
                      as="p"
                      multiline
                      className="mt-2 line-clamp-3 flex-1 text-sm leading-[1.6] text-gray-800"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setOpenId(p.id)}
                    className="mt-5 inline-flex items-center justify-center gap-2 self-start rounded-full border border-gray-300 bg-gray-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-800 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                  >
                    View product
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Product detail popup */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {openProduct &&
              (() => {
                const p = openProduct;
                const priceLabel = `$${p.price}${p.currency && p.currency !== "USD" ? " " + p.currency : ""}`;
                const checkout: CheckoutState = checkoutById[p.id] ?? { phase: "idle" };
                const channel = channelById[p.id] ?? "email";
                const emailVal = emailById[p.id] ?? "";
                const emailMissing =
                  channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal.trim());
                const missingRequired =
                  (p.customFields ?? []).some(
                    (cf) => cf.required && !fieldValues[p.id]?.[cf.name]?.trim(),
                  ) || emailMissing;

                return (
                  <motion.div
                    key="prod-overlay"
                    className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
                      onClick={() => setOpenId(null)}
                    />

                    <motion.div
                      initial={reduced ? {} : { y: 40, scale: 0.98, opacity: 0 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      exit={reduced ? {} : { y: 40, scale: 0.98, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 220, damping: 26 }}
                      className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.5rem] border border-gray-200 bg-white shadow-[0_40px_120px_-20px_rgba(0,0,0,0.45)] sm:max-h-[90vh] sm:rounded-[1.5rem]"
                    >
                      {/* Pinned header */}
                      <div
                        className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-5"
                        style={{ background: `linear-gradient(90deg, rgba(${c.rgb},0.12), rgba(255,255,255,0))` }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold uppercase text-gray-900 sm:text-base">{p.title}</div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-gray-500">{c.title}</div>
                        </div>
                        <span className="shrink-0 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-sm font-bold text-gray-900">
                          {priceLabel}
                        </span>
                        <button
                          onClick={() => setOpenId(null)}
                          aria-label="Close product"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-300 bg-gray-100 text-gray-600 transition hover:bg-gray-200 hover:text-gray-900"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Scrollable body */}
                      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                        {p.image && (
                          <div className="mb-5 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-5">
                            <EditableImage
                              id={`shop.prod.${p.id}.image.large`}
                              defaultSrc={p.image}
                              alt={p.title}
                              eager
                              wrapperClassName="block w-full"
                              className="mx-auto block h-auto max-h-[300px] w-auto max-w-full object-contain"
                            />
                          </div>
                        )}

                        {p.summary && (
                          <p className="mb-5 text-base leading-[1.6] text-gray-800">{p.summary}</p>
                        )}

                        <div className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-gray-600">
                          What&apos;s included
                        </div>
                        <ShopMarkdown source={p.description} className="text-sm" />

                        {/* Checkout block */}
                        <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                          <div className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-gray-500">
                            Checkout · Pay with crypto
                          </div>

                          {checkout.phase === "ready" ? (
                            <div>
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-gray-500">
                                <span>Order {checkout.orderId}</span>
                                <button
                                  type="button"
                                  onClick={() => resetCheckout(p.id)}
                                  className="rounded-full border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-100"
                                >
                                  Start over
                                </button>
                              </div>
                              <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-2xl">
                                  🔒
                                </div>
                                <p className="mb-1 text-sm font-semibold text-gray-900">Your invoice is ready</p>
                                <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-gray-500">
                                  For your security, our crypto payment processor opens in a new tab.
                                  Complete the payment there, then come back to this page.
                                </p>
                                <a
                                  href={checkout.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-gray-900 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-black"
                                  style={{ boxShadow: `0 0 36px -8px rgba(${c.rgb},0.7)` }}
                                >
                                  Open secure payment page →
                                </a>
                                <p className="mt-4 break-all text-[10px] leading-relaxed text-gray-400">
                                  If the button doesn&apos;t work, copy this link:{" "}
                                  <span className="text-gray-600">{checkout.url}</span>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {p.customFields && p.customFields.length > 0 && (
                                <div className="mb-4 space-y-3">
                                  {p.customFields.map((cf) => (
                                    <label key={cf.name} className="block">
                                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-700">
                                        {cf.name}
                                        {cf.required && <span className="ml-1 text-rose-500">*</span>}
                                      </span>
                                      <input
                                        type="text"
                                        placeholder={cf.placeholder || cf.defaultValue || ""}
                                        value={fieldValues[p.id]?.[cf.name] ?? ""}
                                        onChange={(e) => setFieldVal(p.id, cf.name, e.target.value)}
                                        className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none"
                                      />
                                    </label>
                                  ))}
                                </div>
                              )}
                              <div className="mb-4">
                                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-700">
                                  How should we deliver your product?
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                  {(["email", "telegram"] as const).map((ch) => {
                                    const active = channel === ch;
                                    return (
                                      <button
                                        key={ch}
                                        type="button"
                                        onClick={() => setChannelById((s) => ({ ...s, [p.id]: ch }))}
                                        className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                                          active
                                            ? "border-violet-400 bg-violet-50 text-violet-700"
                                            : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                                        }`}
                                      >
                                        {ch === "email" ? "✉️ Email" : "✈️ Telegram"}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {channel === "email" ? (
                                <label className="mb-4 block">
                                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-700">
                                    Email <span className="ml-1 text-rose-500">*</span>
                                  </span>
                                  <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={emailById[p.id] ?? ""}
                                    onChange={(e) => setEmailById((s) => ({ ...s, [p.id]: e.target.value }))}
                                    className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none"
                                  />
                                </label>
                              ) : (
                                <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-700">
                                  After payment, you&apos;ll get a button to open Telegram and tap{" "}
                                  <strong>Start</strong> — your product is delivered straight to your chat.
                                  No email needed.
                                </p>
                              )}

                              <button
                                type="button"
                                disabled={checkout.phase === "loading" || missingRequired}
                                onClick={() => startCheckout(p)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-gray-900 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ boxShadow: `0 0 36px -8px rgba(${c.rgb},0.7)` }}
                              >
                                {checkout.phase === "loading"
                                  ? "Creating invoice…"
                                  : missingRequired
                                    ? "Fill required fields"
                                    : `Pay ${priceLabel} with crypto →`}
                              </button>

                              {checkout.phase === "error" && (
                                <p className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                                  {checkout.message}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })()}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  );
}
