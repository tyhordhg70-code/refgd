"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type StarsState =
  | { phase: "idle" }
  | { phase: "loading"; method: "app" | "card" }
  | { phase: "error"; message: string };

/**
 * ShopProductList — product grid for one category.
 *
 * Three payment paths in the popup:
 *  1. Crypto (NOWPayments) — opens invoice in new tab.
 *  2. Apple Pay / Google Pay — Telegram Stars, navigates to /invoice/[orderId].
 *  3. Credit / Debit Card — Telegram Stars via Telegram Web (no markup),
 *     navigates to /invoice/[orderId] which shows cross-device helpers.
 */
export default function ShopProductList({ category: c }: { category: Category }) {
  const reduced = useReducedMotion();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [checkoutById, setCheckoutById] = useState<Record<string, CheckoutState>>({});
  const [starsById, setStarsById] = useState<Record<string, StarsState>>({});
  const [channelById, setChannelById] = useState<Record<string, "email" | "telegram">>({});
  const [emailById, setEmailById] = useState<Record<string, string>>({});

  useEffect(() => setMounted(true), []);

  // Preload all product images immediately on mount so they're in the browser
  // cache by the time the cards animate into view — Billgang-style zero-wait images.
  useEffect(() => {
    c.products.forEach((p) => {
      if (!p.image) return;
      const src = /^https?:\/\//i.test(p.image)
        ? `/api/img?u=${encodeURIComponent(p.image)}`
        : p.image;
      const img = new window.Image();
      img.src = src;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Crypto checkout (NOWPayments) ─────────────────────────────────────────
  const startCheckout = async (p: Product) => {
    setCheckoutById((s) => ({ ...s, [p.id]: { phase: "loading" } }));
    const channel = channelById[p.id] ?? "email";
    const email = emailById[p.id]?.trim() || null;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: p.id,
          customFields: fieldValues[p.id] ?? {},
          channel,
          email: channel === "email" ? email : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        invoiceUrl?: string;
        orderId?: string;
        error?: string;
      };
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

  // ── Telegram Stars checkout ───────────────────────────────────────────────
  /**
   * Both methods navigate to /invoice/[orderId] which polls the status API,
   * shows split-step progress for large orders, and auto-redirects on payment.
   * method "app"  → Apple / Google Pay (25 % markup): invoice opens directly.
   * method "card" → Telegram Web (no markup): cross-device helpers on page.
   */
  const startStarsCheckout = async (p: Product, method: "app" | "card") => {
    setStarsById((s) => ({ ...s, [p.id]: { phase: "loading", method } }));
    try {
      const res = await fetch("/api/telegram/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: p.id,
          customFields: fieldValues[p.id] ?? {},
          markupPct: method === "app" ? 0.25 : 0,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        invoiceUrl?: string;
        invoiceUrl2?: string;
        orderId?: string;
        split?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.invoiceUrl) {
        setStarsById((s) => ({
          ...s,
          [p.id]: { phase: "error", message: data.error ?? "Failed to create payment link" },
        }));
        return;
      }
      // Navigate to the dedicated invoice monitoring page for all Stars payments.
      // The page polls order status, shows split-step progress, and auto-redirects
      // to the access page once the order is fully paid.
      const params = new URLSearchParams({
        url: data.invoiceUrl!,
        type: method,
        title: p.title,
      });
      if (data.invoiceUrl2) params.set("url2", data.invoiceUrl2);
      router.push(`/invoice/${data.orderId}?${params.toString()}`);
    } catch (e) {
      setStarsById((s) => ({ ...s, [p.id]: { phase: "error", message: String(e) } }));
    }
  };

  const resetStars = (pid: string) =>
    setStarsById((s) => ({ ...s, [pid]: { phase: "idle" } }));

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
                initial={reduced ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={reduced ? undefined : { y: -4 }}
                transition={{ duration: 0.5, delay: 0.08 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10),0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-violet-200 hover:shadow-[0_16px_48px_-12px_rgba(109,40,217,0.14)]"
              >
                {p.image && (
                  <div className="relative w-full overflow-hidden rounded-t-[1.5rem] bg-white aspect-[4/3]">
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
                const stars: StarsState = starsById[p.id] ?? { phase: "idle" };
                const missingRequired = (p.customFields ?? []).some(
                  (cf) => cf.required && !fieldValues[p.id]?.[cf.name]?.trim(),
                );
                const appLoading = stars.phase === "loading" && stars.method === "app";
                const cardLoading = stars.phase === "loading" && stars.method === "card";

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
                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6">
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

                        {/* ── Checkout block ─────────────────────────────── */}
                        <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                          <div className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-gray-500">
                            Checkout
                          </div>

                          {checkout.phase === "ready" ? (
                            /* ── Crypto invoice ready ─── */
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
                            /* ── Payment method selection ─── */
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

                              {/* ── Delivery channel selector ── */}
                              {(() => {
                                const ch = channelById[p.id] ?? "email";
                                return (
                                  <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                                    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                                      Deliver my order via
                                    </p>
                                    <div className="mb-3 flex gap-2">
                                      {(["email", "telegram"] as const).map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setChannelById((s) => ({ ...s, [p.id]: opt }))
                                          }
                                          className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                            ch === opt
                                              ? "border-violet-400 bg-violet-100 text-violet-700"
                                              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                                          }`}
                                        >
                                          {opt === "email" ? "📧 Email" : "✈️ Telegram"}
                                        </button>
                                      ))}
                                    </div>
                                    {ch === "email" ? (
                                      <input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={emailById[p.id] ?? ""}
                                        onChange={(e) =>
                                          setEmailById((s) => ({ ...s, [p.id]: e.target.value }))
                                        }
                                        className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none"
                                      />
                                    ) : (
                                      <p className="text-[11px] leading-relaxed text-gray-500">
                                        After payment, message our Telegram bot — your product arrives instantly in your chat.
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Crypto */}
                              <button
                                type="button"
                                disabled={checkout.phase === "loading" || missingRequired}
                                onClick={() => startCheckout(p)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-gray-900 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ boxShadow: `0 0 36px -8px rgba(${c.rgb},0.7)` }}
                              >
                                {checkout.phase === "loading" ? (
                                  "Creating invoice…"
                                ) : missingRequired ? (
                                  "Fill required fields"
                                ) : (
                                  <>
                                    {/* Bitcoin / crypto icon */}
                                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                      <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.974.225.955.236c.537.136.633.486.617.766l-1.48 5.934c-.075.166-.24.42-.614.323.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.236-.54 2.19 1.32.327.54-2.165c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.928zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.09z"/>
                                    </svg>
                                    Pay {priceLabel} with crypto →
                                  </>
                                )}
                              </button>

                              {checkout.phase === "error" && (
                                <p className="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                                  {checkout.message}
                                </p>
                              )}

                              {/* ── OR separator ── */}
                              <div className="relative my-4 flex items-center gap-3">
                                <div className="h-px flex-1 bg-gray-200" />
                                <span className="text-[11px] font-medium text-gray-400">or</span>
                                <div className="h-px flex-1 bg-gray-200" />
                              </div>

                              {/* Commission notice for Apple / Google Pay */}
                              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                                <span className="mt-px shrink-0 text-amber-500" aria-hidden>⚠</span>
                                <p className="text-[11px] leading-relaxed text-amber-700">
                                  <strong>Apple Pay &amp; Google Pay include a 25 % platform fee</strong> charged by Apple/Google. The fee is added to your Stars total at checkout.
                                </p>
                              </div>

                              {/* Apple Pay + Google Pay — combined */}
                              <button
                                type="button"
                                disabled={stars.phase === "loading" || missingRequired}
                                onClick={() => startStarsCheckout(p, "app")}
                                className="flex w-full items-center justify-center gap-3 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {appLoading ? "Opening Telegram…" : (
                                  <>
                                    {/* Apple logo */}
                                    <svg className="h-[17px] w-[17px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                    </svg>
                                    <span>Apple Pay</span>
                                    <span className="opacity-30">|</span>
                                    {/* Google G logo */}
                                    <svg className="h-[17px] w-[17px] shrink-0" viewBox="0 0 24 24" aria-hidden>
                                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    <span>Google Pay</span>
                                  </>
                                )}
                              </button>


                              {/* ── OR separator ── */}
                              <div className="relative my-4 flex items-center gap-3">
                                <div className="h-px flex-1 bg-gray-200" />
                                <span className="text-[11px] font-medium text-gray-400">or</span>
                                <div className="h-px flex-1 bg-gray-200" />
                              </div>

                              {/* Credit / Debit Card */}
                              <button
                                type="button"
                                disabled={stars.phase === "loading" || missingRequired}
                                onClick={() => startStarsCheckout(p, "card")}
                                className="flex w-full items-center justify-center gap-2.5 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {cardLoading ? (
                                  "Generating payment link…"
                                ) : (
                                  <>
                                    <svg className="h-[17px] w-[17px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                      <line x1="1" y1="10" x2="23" y2="10"/>
                                    </svg>
                                    Credit / Debit Card
                                  </>
                                )}
                              </button>

                              <p className="mt-2 text-center text-[10px] text-gray-400">
                                No platform fee · via Telegram Web
                              </p>

                              {stars.phase === "error" && (
                                <p className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                                  {stars.message}
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
