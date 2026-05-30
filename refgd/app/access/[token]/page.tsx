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

  const linkMode =
    !!config && config.enabled && config.type === "link" && isUrl(config.content);
  const textMode =
    !!config && config.enabled && config.type === "text" && !!config.content.trim();
  const destination = linkMode ? config!.content.trim() : null;
  const buttonLabel = config?.buttonLabel || "Access your product";

  // Telegram buyer who paid but hasn't connected their chat yet → deep link.
  let tgDeepLink: string | null = null;
  if (order.channel === "telegram" && paid && !order.telegramChatId) {
    const bot = await getBotUsername();
    if (bot) tgDeepLink = `https://t.me/${bot}?start=${order.deliveryToken}`;
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

            {paid ? (
              <>
                <div className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl ring-1 ring-emerald-400/30">
                  ✅
                </div>
                <h1 className="heading-display mt-5 text-2xl font-extrabold sm:text-3xl">
                  Thank you for your purchase
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Your payment is confirmed. Your product is ready below.
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
            {paid ? (
              <>
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
                    Your payment is confirmed. Your product will be delivered to you
                    shortly{order.channel === "email" && order.email ? ` at ${order.email}` : ""}.
                  </p>
                )}

                {tgDeepLink && (
                  <a
                    href={tgDeepLink}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-6 py-3.5 text-sm font-bold text-sky-200 transition hover:bg-sky-500/20"
                  >
                    Receive on Telegram →
                  </a>
                )}

                {order.channel === "email" && order.email && (
                  <p className="mt-5 text-center text-xs text-white/45">
                    A copy has also been sent to {order.email}.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 text-xs text-white/45">
                  <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
                  Checking payment status…
                </div>
                {order.channel === "email" && order.email && (
                  <p className="mt-4 text-center text-xs text-white/45">
                    Once confirmed, your product is delivered here and emailed to{" "}
                    {order.email}.
                  </p>
                )}
                {order.channel === "telegram" && (
                  <p className="mt-4 text-center text-xs text-white/45">
                    Once confirmed, you&apos;ll be able to receive it on Telegram and
                    right here on this page.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/35">
          Keep this link private — anyone with it can view your delivery.
        </p>
      </div>
    </main>
  );
}
