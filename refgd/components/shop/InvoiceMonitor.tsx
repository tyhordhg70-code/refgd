"use client";

import { useEffect, useRef, useState } from "react";

type StatusData = {
  ok: boolean;
  status: "pending" | "paid" | "delivered" | "failed";
  productTitle?: string;
  createdAt?: string;
  accessUrl?: string;
  awaitingPart2?: boolean;
  part2Status?: "pending" | "paid" | "delivered" | "failed";
};

export type InvoiceMonitorProps = {
  orderId: string;
  invoiceUrl: string;
  invoiceUrl2?: string;
  paymentType: "app" | "card";
  productTitle: string;
};

const EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const POLL_INTERVAL_MS = 3000;

export default function InvoiceMonitor({
  orderId,
  invoiceUrl,
  invoiceUrl2,
  paymentType,
  productTitle,
}: InvoiceMonitorProps) {
  const [data, setData] = useState<StatusData | null>(null);
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSplit = !!invoiceUrl2;

  // ── Start at the top ───────────────────────────────────────────────────
  // Navigating in from the product page can carry over the previous scroll
  // position (browser scroll restoration), so the payment screen would open
  // already scrolled halfway down. Force it to the top on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = "scrollRestoration" in window.history
      ? window.history.scrollRestoration
      : null;
    if (prev !== null) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      if (prev !== null) window.history.scrollRestoration = prev;
    };
  }, []);

  // ── Status polling ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as StatusData;
        if (!active) return;
        setData(json);

        // Expiry check
        if (json.createdAt) {
          const created = new Date(json.createdAt).getTime();
          if (Date.now() - created > EXPIRY_MS) {
            setExpired(true);
            clearInterval(pollRef.current!);
            return;
          }
        }

        // Full success — redirect to access page
        const fullyPaid =
          (json.status === "paid" || json.status === "delivered") &&
          !json.awaitingPart2;
        if (fullyPaid && json.accessUrl && !redirecting) {
          clearInterval(pollRef.current!);
          setRedirecting(true);
          setTimeout(() => {
            if (active) window.location.href = json.accessUrl!;
          }, 1800);
        }
      } catch {
        // network hiccup — try again next tick
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(pollRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // ── Countdown timer ────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (!data?.createdAt) return;
      const created = new Date(data.createdAt).getTime();
      const remaining = Math.max(0, EXPIRY_MS - (Date.now() - created));
      if (remaining === 0) {
        setExpired(true);
        setTimeLeft(null);
        clearInterval(timerRef.current!);
        return;
      }
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current!);
  }, [data?.createdAt]);

  // ── Derived state ──────────────────────────────────────────────────────
  const status = data?.status ?? "pending";
  const part1Paid = status === "paid" || status === "delivered";
  const part2Paid =
    data?.part2Status === "paid" || data?.part2Status === "delivered";
  const awaitingPart2 = isSplit && !!data?.awaitingPart2;
  const fullyComplete = part1Paid && (!isSplit || part2Paid);

  // ── Status bar label ───────────────────────────────────────────────────
  const statusInfo: { label: string; color: string; spin: boolean } =
    redirecting
      ? { label: "Redirecting to your delivery…", color: "text-emerald-700", spin: false }
      : expired
        ? { label: "Invoice expired", color: "text-rose-600", spin: false }
        : fullyComplete
          ? { label: "Payment confirmed ✓", color: "text-emerald-700", spin: false }
          : awaitingPart2
            ? { label: "Part 1 complete ✓ — awaiting Part 2", color: "text-amber-600", spin: true }
            : status === "failed"
              ? { label: "Payment failed", color: "text-rose-600", spin: false }
              : { label: "Waiting for payment…", color: "text-gray-500", spin: true };

  // ── Styles ─────────────────────────────────────────────────────────────
  const cardBorder = (paid: boolean, active: boolean, dimmed: boolean) =>
    `rounded-2xl border bg-white p-5 shadow-sm transition-all ${
      paid
        ? "border-emerald-200 bg-emerald-50"
        : active
          ? "border-gray-200"
          : dimmed
            ? "border-gray-100 opacity-40"
            : "border-gray-200"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-3xl">
            ⭐
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Complete your payment
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {productTitle || data?.productTitle || "Your order"}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-gray-400">
            {orderId}
          </p>
        </div>

        {/* Live status bar */}
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3.5 shadow-sm ${
            fullyComplete || redirecting
              ? "border-emerald-200"
              : expired
                ? "border-rose-200"
                : awaitingPart2
                  ? "border-amber-200"
                  : "border-gray-200"
          }`}
        >
          {redirecting || fullyComplete ? (
            <svg className="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : expired ? (
            <span className="text-rose-500 text-sm">✕</span>
          ) : (
            <svg className="h-4 w-4 shrink-0 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          )}
          <span className={`text-sm font-semibold ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {timeLeft && !expired && !fullyComplete && !redirecting && (
            <span className="ml-auto font-mono text-xs text-gray-400">
              {timeLeft}
            </span>
          )}
        </div>

        {/* ── Expired ── */}
        {expired ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
            <div className="mb-3 text-4xl">⏱</div>
            <h2 className="mb-2 text-lg font-bold text-rose-800">Invoice expired</h2>
            <p className="mb-6 text-sm leading-relaxed text-rose-700">
              This invoice is no longer valid (1-hour window passed).
              <br />
              Please return to the shop and start a new order.
            </p>
            <a
              href="/shop-methods"
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              ← Back to shop
            </a>
          </div>

        ) : redirecting ? (
          /* ── Redirecting ── */
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <h2 className="mb-2 text-lg font-bold text-emerald-800">Payment confirmed!</h2>
            <p className="text-sm text-emerald-600">
              Taking you to your delivery…
            </p>
          </div>

        ) : (
          /* ── Payment buttons ── */
          <div className="space-y-4">

            {/* Two-step explainer — only shown for split (large) orders */}
            {isSplit && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
                <p className="text-sm font-semibold text-indigo-900">
                  This order is paid in 2 quick steps
                </p>
                <p className="mt-1 text-xs leading-relaxed text-indigo-700">
                  Telegram limits how many Stars can be sent in one payment, so larger
                  orders are split in two. Pay <strong>Step 1</strong>, then{" "}
                  <strong>Step 2</strong> right below it — your product unlocks
                  automatically once both are confirmed.
                </p>
              </div>
            )}

            {/* Part-1 / single invoice */}
            <div className={cardBorder(part1Paid, !part1Paid, false)}>
              <div className="mb-3 flex items-center gap-2">
                {isSplit && (
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                      part1Paid ? "bg-emerald-500" : "bg-gray-900"
                    }`}
                  >
                    {part1Paid ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : "1"}
                  </span>
                )}
                <p className="text-sm font-semibold text-gray-900">
                  {isSplit
                    ? part1Paid ? "First payment complete" : "First payment"
                    : part1Paid ? "Payment complete" : (paymentType === "app" ? "Pay with Apple Pay or Google Pay" : "Pay with card via Telegram Web")}
                </p>
              </div>

              {part1Paid ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Received
                </div>
              ) : paymentType === "app" ? (
                /* Apple/Google Pay button */
                <a
                  href={invoiceUrl}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  <svg className="h-[17px] w-[17px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <span>Apple Pay</span>
                  <span className="opacity-30">|</span>
                  <svg className="h-[17px] w-[17px] shrink-0" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Google Pay</span>
                </a>
              ) : null}

              {/* Apple/Google Pay add a 25% fee — make it explicit on every
                  device (mobile included) that paying in the browser via
                  Telegram Web is an option. */}
              {!part1Paid && paymentType === "app" && (
                <a
                  href={invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-xs transition hover:bg-blue-100"
                >
                  <svg className="h-5 w-5 shrink-0 text-[#2AABEE]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-800">Pay via Telegram Web instead</p>
                    <p className="text-[10px] text-blue-600">Works on phone or computer — opens the invoice in your browser and avoids the 25% Apple/Google fee</p>
                  </div>
                  <span className="text-blue-400">→</span>
                </a>
              )}

              {part1Paid ? null : paymentType === "app" ? null : (
                /* Card / Telegram Web */
                <div className="space-y-3">
                  <a
                    href={invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Open Telegram Web →
                  </a>
                  <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                    <span className="mt-px shrink-0 text-blue-500">💻</span>
                    <p className="text-[11px] leading-relaxed text-blue-700">
                      <strong>Complete on desktop</strong> — paying via Telegram Desktop avoids the 25% Apple/Google fee.
                    </p>
                  </div>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(invoiceUrl)}&text=${encodeURIComponent("Tap to complete your payment")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs transition hover:bg-gray-100"
                  >
                    <svg className="h-5 w-5 shrink-0 text-[#2AABEE]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">On phone? Send the link to yourself</p>
                      <p className="text-[10px] text-gray-500">Choose <strong>Saved Messages</strong>, then open it from Telegram Desktop to pay with no added fee</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent("Your payment link")}&body=${encodeURIComponent("Open this link to complete your Stars payment:\n\n" + invoiceUrl + "\n\nSign in to Telegram Web — your invoice appears automatically.")}`}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs transition hover:bg-gray-100"
                  >
                    <svg className="h-5 w-5 shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Email to myself</p>
                      <p className="text-[10px] text-gray-500">Opens your mail app · open the link on desktop</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </a>
                </div>
              )}
            </div>

            {/* Part-2 button (split only) */}
            {isSplit && invoiceUrl2 && (
              <div className={cardBorder(part2Paid, part1Paid && !part2Paid, !part1Paid)}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                      part2Paid ? "bg-emerald-500" : part1Paid ? "bg-indigo-600" : "bg-gray-400"
                    }`}
                  >
                    {part2Paid ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : "2"}
                  </span>
                  <p className="text-sm font-semibold text-gray-900">
                    {part2Paid ? "Second payment complete" : "Second payment"}
                  </p>
                </div>

                {part2Paid ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Received
                  </div>
                ) : !part1Paid ? (
                  <p className="text-xs text-gray-400">Complete Step 1 first</p>
                ) : (
                  <a
                    href={invoiceUrl2}
                    className={`flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition ${
                      paymentType === "app"
                        ? "bg-black hover:bg-gray-800"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {paymentType === "app" ? (
                      <>
                        <svg className="h-[15px] w-[15px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        Open Payment 2 of 2 →
                      </>
                    ) : (
                      "Open Payment 2 of 2 (Telegram Web) →"
                    )}
                  </a>
                )}
              </div>
            )}

            <p className="text-center text-[11px] text-gray-400">
              This page updates automatically every few seconds.
              <br />
              Keep it open until your payment is confirmed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
