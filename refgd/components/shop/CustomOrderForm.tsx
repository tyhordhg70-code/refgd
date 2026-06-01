"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StarsState =
  | { phase: "idle" }
  | { phase: "loading"; method: "app" | "card" }
  | { phase: "error"; message: string };

/**
 * CustomOrderForm — price-entry + Telegram Stars checkout for the
 * unlisted custom-order page.
 *
 * The customer types any amount ≥ $1, adds an optional note, then picks
 * their payment method. Uses the same Stars splitting logic and invoice-
 * monitoring page as all other shop products.
 */
export default function CustomOrderForm() {
  const router = useRouter();
  const [amountRaw, setAmountRaw] = useState("");
  const [note, setNote] = useState("");
  const [stars, setStars] = useState<StarsState>({ phase: "idle" });

  const amount = parseFloat(amountRaw);
  const valid = isFinite(amount) && amount >= 1;
  const anyLoading = stars.phase === "loading";
  const isLoadingCard = stars.phase === "loading" && stars.method === "card";
  const isLoadingApp = stars.phase === "loading" && stars.method === "app";

  const resetStars = () => setStars({ phase: "idle" });

  const startCheckout = async (method: "app" | "card") => {
    if (!valid) return;
    setStars({ phase: "loading", method });
    try {
      const res = await fetch("/api/telegram/custom-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: amount,
          title: "Custom Order",
          note: note.trim() || undefined,
          markupPct: method === "app" ? 0.25 : 0,
          method,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        orderId?: string;
        invoiceUrls?: string[];
        error?: string;
      };
      const urls = (data.invoiceUrls ?? []).filter(Boolean);
      if (!res.ok || !data.ok || urls.length === 0) {
        setStars({
          phase: "error",
          message: data.error ?? "Failed to create payment link",
        });
        return;
      }
      const params = new URLSearchParams({
        urls: urls.join(","),
        type: method,
        title: "Custom Order",
      });
      router.push(`/invoice/${data.orderId}?${params.toString()}`);
    } catch (e) {
      setStars({ phase: "error", message: String(e) });
    }
  };

  return (
    <div className="mt-8 rounded-[1.5rem] border border-gray-200 bg-white p-6 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10)] sm:p-8">

      {/* ── Price input ── */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.22em] text-gray-500">
          Your price (USD)
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-300 select-none">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            placeholder="0.00"
            value={amountRaw}
            onChange={(e) => {
              setAmountRaw(e.target.value);
              resetStars();
            }}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-9 pr-5 text-2xl font-bold text-gray-900 placeholder:text-gray-300 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition"
          />
        </div>
        {amountRaw !== "" && !valid && (
          <p className="mt-1.5 text-xs text-rose-500">Minimum $1.00</p>
        )}
        {valid && (
          <p className="mt-1.5 text-xs text-gray-400">
            ≈ {Math.ceil(amount * 50).toLocaleString()} Telegram Stars
          </p>
        )}
      </div>

      {/* ── Order note ── */}
      <div className="mb-6">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.22em] text-gray-500">
          Order note{" "}
          <span className="normal-case font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Walmart $500 aged insert, mentorship session…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none transition"
        />
      </div>

      {/* ── Error ── */}
      {stars.phase === "error" && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="mt-0.5 shrink-0">⚠</span>
          <div>
            <div className="font-semibold">{stars.message}</div>
            <button
              type="button"
              onClick={resetStars}
              className="mt-1 text-xs underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Payment buttons ── */}
      <div className="space-y-3">

        {/* Telegram Web / Desktop — no fee */}
        <button
          type="button"
          disabled={!valid || anyLoading}
          onClick={() => startCheckout("card")}
          className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-gray-900 shadow-sm transition hover:border-violet-300 hover:shadow-[0_8px_28px_-6px_rgba(109,40,217,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ boxShadow: valid && !anyLoading ? "0 0 28px -8px rgba(109,40,217,0.22)" : undefined }}
        >
          {/* Telegram logo */}
          <svg className="h-5 w-5 shrink-0 text-[#2AABEE]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.76 8.3c-.13.6-.48.74-.97.46l-2.69-1.98-1.3 1.24c-.14.14-.26.26-.54.26l.19-2.7 5-4.5c.21-.19-.05-.29-.33-.1l-6.19 3.9-2.66-.83c-.58-.18-.59-.58.12-.86l10.4-4c.48-.18.91.12.73.81z" />
          </svg>
          {isLoadingCard ? (
            "Preparing invoice…"
          ) : (
            <span className="flex flex-col items-start sm:flex-row sm:items-center sm:gap-2">
              <span>Pay with Telegram Stars</span>
              <span className="text-[10px] font-medium normal-case tracking-normal text-gray-400 sm:text-[11px]">
                Telegram Web / Desktop · No fee
              </span>
            </span>
          )}
        </button>

        {/* Apple / Google Pay — +25% */}
        <button
          type="button"
          disabled={!valid || anyLoading}
          onClick={() => startCheckout("app")}
          className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-gray-700 transition hover:border-violet-200 hover:bg-violet-50/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Apple logo */}
          <svg className="h-5 w-5 shrink-0 text-gray-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          {isLoadingApp ? (
            "Preparing invoice…"
          ) : (
            <span className="flex flex-col items-start sm:flex-row sm:items-center sm:gap-2">
              <span>Apple / Google Pay</span>
              <span className="text-[10px] font-medium normal-case tracking-normal text-gray-400 sm:text-[11px]">
                via Telegram · +25% platform fee
              </span>
            </span>
          )}
        </button>
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-gray-400">
        Powered by Telegram Stars &nbsp;·&nbsp; No card required &nbsp;·&nbsp; Instant confirmation
      </p>
    </div>
  );
}
