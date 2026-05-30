import { notFound } from "next/navigation";
import { getOrderByToken, getProductDelivery } from "@/lib/delivery";
import { isUrl } from "@/lib/delivery-render";
import { getBotUsername } from "@/lib/notify";
import AccessRefresh from "../AccessRefresh";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Your delivery — RefundGod",
  robots: { index: false },
};

export default async function AccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  const config = await getProductDelivery(order.productId);
  const paid = order.status === "paid" || order.status === "delivered";

  // Links expire 24 h after payment confirmation (updatedAt ≈ when status flipped to paid).
  const EXPIRY_MS = 24 * 60 * 60 * 1000;
  const expiresAt = paid ? new Date(order.updatedAt).getTime() + EXPIRY_MS : null;
  const now = Date.now();
  const expired = expiresAt !== null && now > expiresAt;
  const msLeft = expiresAt !== null ? Math.max(0, expiresAt - now) : null;
  const hoursLeft = msLeft !== null ? Math.floor(msLeft / 3600000) : null;
  const minLeft = msLeft !== null ? Math.floor((msLeft % 3600000) / 60000) : null;

  const linkMode =
    !!config && config.enabled && config.type === "link" && isUrl(config.content);
  const textMode =
    !!config && config.enabled && config.type === "text" && !!config.content.trim();
  const destination = linkMode ? config!.content.trim() : null;
  const buttonLabel = config?.buttonLabel || "Access your product";

  // Telegram: deep link (with token) only while active; generic bot link for expired page.
  let tgDeepLink: string | null = null;
  let tgBotLink: string | null = null;
  if (paid) {
    const bot = await getBotUsername();
    if (bot) {
      tgBotLink = `https://t.me/${bot}`;
      if (!expired) tgDeepLink = `https://t.me/${bot}?start=${order.deliveryToken}`;
    }
  }

  const priceLabel = `$${order.price}${order.currency && order.currency !== "USD" ? " " + order.currency : ""}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-16">
        <div className="w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#12141c]/90 shadow-[0_40px_120px_-30px_rgba(124,58,237,0.45)] backdrop-blur">
          <div className="px-7 pt-8 text-center sm:px-9">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-violet-300">
              RefundGod
            </p>

            {expired ? (
              <>
                <div className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full bg-rose-500/15 text-3xl ring-1 ring-rose-400/30">
                  🔒
                </div>
                <h1 className="heading-display mt-5 text-2xl font-extrabold sm:text-3xl">
                  This link has expired
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Delivery links are active for 24 hours after payment.
                </p>
              </>
            ) : paid ? (
              <>
                <div className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl ring-1 ring-emerald-400/30">
                  ✅
                </div>
                <h1 className="heading-display mt-5 text-2xl font-extrabold sm:text-3xl">
                  Thank you for your purchase
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Your product is below. Save it to Telegram — this link expires in{" "}
                  {hoursLeft}h {minLeft}m.
                </p>
              </>
            ) : (
              <>
                <AccessRefresh seconds={8} />
                <div className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-3xl ring-1 ring-amber-400/25">
                  <span className="inline-block animate-pulse">⏳</span>
                </div>
                <h1 className="heading-display mt-5 text-2xl font-extrabold sm:text-3xl">
                  Waiting for payment
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  We&apos;re waiting for your crypto payment to confirm on-chain. This
                  page updates automatically — keep it open.
                </p>
              </>
            )}
          </div>

          {/* Order summary */}
          <div className="mx-7 mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:mx-9">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Product
            </div>
            <div className="mt-1 text-base font-bold">{order.productTitle}</div>
            <div className="mt-1 text-xs text-white/50">
              Order {order.id} · {priceLabel}
            </div>
          </div>

          {/* Delivery body */}
          <div className="px-7 pb-9 pt-6 sm:px-9">
            {expired ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-5 text-center">
                <p className="text-sm leading-relaxed text-white/70">
                  This delivery link was only active for 24 hours after your payment.
                </p>
                {tgBotLink ? (
                  <p className="mt-3 text-sm text-white/50">
                    If you saved your delivery to Telegram, it&apos;s waiting in your{" "}
                    <a href={tgBotLink} className="text-sky-400 underline">bot chat</a>.
                    Otherwise contact support.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-white/50">
                    Contact support if you need help recovering your delivery.
                  </p>
                )}
              </div>
            ) : paid ? (
              <>
                {tgDeepLink && (
                  <div className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] p-4">
                    <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                      ⏰ {hoursLeft}h {minLeft}m left — save now for permanent access
                    </p>
                    <a
                      href={tgDeepLink}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-sky-400/35 bg-sky-500/15 px-6 py-3 text-sm font-bold text-sky-200 transition hover:bg-sky-500/25"
                    >
                      ✈️ Save to Telegram (permanent copy)
                    </a>
                  </div>
                )}

                {config?.message?.trim() && (
                  <p className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/80">
                    {config.message.trim()}
                  </p>
                )}

                {linkMode && destination && (
                  <a
                    href={destination}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-violet-500"
                    style={{ boxShadow: "0 0 44px -8px rgba(124,58,237,0.85)" }}
                  >
                    {buttonLabel} →
                  </a>
                )}

                {textMode && (
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      Your delivery
                    </div>
                    <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-emerald-200">
                      {config!.content.trim()}
                    </pre>
                  </div>
                )}

                {!config?.enabled && (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/70">
                    Your payment is confirmed. Your product will be delivered to you shortly.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 text-xs text-white/45">
                  <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
                  Checking payment status…
                </div>
                <p className="mt-4 text-center text-xs text-white/45">
                  Once confirmed your product will be ready right here — save the URL of this page.
                </p>
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
