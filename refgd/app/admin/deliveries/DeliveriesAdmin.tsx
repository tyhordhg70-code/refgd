"use client";

import { useState } from "react";
import type { ProductDelivery, Order, DeliveryType } from "@/lib/delivery";

type ProductLite = { id: string; title: string; image: string | null };

type Props = {
  initialProducts: ProductLite[];
  initialDeliveries: Record<string, ProductDelivery>;
  initialOrders: Order[];
};

const emptyConfig = (productId: string): ProductDelivery => ({
  productId,
  enabled: false,
  type: "link",
  content: "",
  buttonLabel: "Access your product",
  message: "",
  deliveryTime: "Instant",
});

export default function DeliveriesAdmin({
  initialProducts,
  initialDeliveries,
  initialOrders,
}: Props) {
  const [deliveries, setDeliveries] =
    useState<Record<string, ProductDelivery>>(initialDeliveries);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ProductDelivery>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [tgResult, setTgResult] = useState<string | null>(null);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);

  const draftFor = (p: ProductLite): ProductDelivery =>
    drafts[p.id] ?? deliveries[p.id] ?? emptyConfig(p.id);

  const setDraft = (id: string, patch: Partial<ProductDelivery>) =>
    setDrafts((s) => ({
      ...s,
      [id]: { ...(s[id] ?? deliveries[id] ?? emptyConfig(id)), ...patch },
    }));

  const save = async (id: string) => {
    const d = drafts[id] ?? deliveries[id] ?? emptyConfig(id);
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/shop/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      const j = await res.json();
      if (res.ok && j.delivery) {
        setDeliveries((s) => ({ ...s, [id]: j.delivery }));
        setDrafts((s) => {
          const n = { ...s };
          delete n[id];
          return n;
        });
      }
    } finally {
      setSavingId(null);
    }
  };

  const connectTelegram = async () => {
    setTgResult("Connecting…");
    try {
      const res = await fetch("/api/telegram/setup");
      const j = await res.json();
      setTgResult(
        j.ok
          ? "✅ Telegram webhook connected."
          : `⚠️ ${j.error ?? j.telegram?.description ?? "Failed — check TELEGRAM_BOT_TOKEN."}`,
      );
    } catch (e) {
      setTgResult(`⚠️ ${String(e)}`);
    }
  };

  const refreshOrders = async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    const j = await res.json();
    if (j.orders) setOrders(j.orders);
  };

  const deliverNow = async (orderId: string, resend: boolean) => {
    setBusyOrder(orderId);
    try {
      await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, resend }),
      });
      await refreshOrders();
    } finally {
      setBusyOrder(null);
    }
  };

  return (
    <div>
      {/* Tabs + telegram setup */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          {(["products", "orders"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                tab === t ? "bg-white text-gray-900" : "text-white/60 hover:text-white"
              }`}
            >
              {t === "products" ? "Product delivery" : `Orders (${orders.length})`}
            </button>
          ))}
        </div>
        <button
          onClick={connectTelegram}
          className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20"
        >
          Connect Telegram bot
        </button>
        {tgResult && <span className="text-xs text-white/60">{tgResult}</span>}
      </div>

      {tab === "products" ? (
        <div className="space-y-3">
          {initialProducts.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No products yet. Create products in{" "}
              <a className="text-violet-300 underline" href="/admin/shop">
                Manage shop
              </a>{" "}
              first.
            </p>
          )}
          {initialProducts.map((p) => {
            const live = deliveries[p.id];
            const d = draftFor(p);
            const open = openId === p.id;
            const configured = live?.enabled && live?.content?.trim();
            const dirty = !!drafts[p.id];
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <button
                  onClick={() => setOpenId(open ? null : p.id)}
                  className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-white/30">📦</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {p.title}
                    </span>
                    <span className="text-[11px] text-white/45">{p.id}</span>
                  </span>
                  {configured ? (
                    <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Auto-delivery on
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Off
                    </span>
                  )}
                  <span className="shrink-0 text-white/40">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="border-t border-white/10 px-4 py-5 sm:px-5">
                    <label className="mb-4 flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={d.enabled}
                        onChange={(e) => setDraft(p.id, { enabled: e.target.checked })}
                        className="h-4 w-4 accent-violet-500"
                      />
                      <span className="text-sm font-medium text-white">
                        Automatically deliver this product after payment
                      </span>
                    </label>

                    <div className="mb-4">
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        Delivery type
                      </div>
                      <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1">
                        {(["link", "text"] as DeliveryType[]).map((t) => (
                          <button
                            key={t}
                            onClick={() => setDraft(p.id, { type: t })}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              d.type === t
                                ? "bg-violet-600 text-white"
                                : "text-white/55 hover:text-white"
                            }`}
                          >
                            {t === "link" ? "🔗 Link" : "📝 Text"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field label={d.type === "link" ? "Custom link the buyer receives" : "Text / credentials delivered"}>
                      {d.type === "link" ? (
                        <input
                          type="url"
                          placeholder="https://example.com/your-product"
                          value={d.content}
                          onChange={(e) => setDraft(p.id, { content: e.target.value })}
                          className="block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
                        />
                      ) : (
                        <textarea
                          rows={3}
                          placeholder="Anything the buyer should receive (account, key, instructions…)"
                          value={d.content}
                          onChange={(e) => setDraft(p.id, { content: e.target.value })}
                          className="block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
                        />
                      )}
                    </Field>

                    {d.type === "link" && (
                      <Field label="Button label">
                        <input
                          type="text"
                          placeholder="Access your product"
                          value={d.buttonLabel}
                          onChange={(e) => setDraft(p.id, { buttonLabel: e.target.value })}
                          className="block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
                        />
                      </Field>
                    )}

                    <Field label="Thank-you message (optional)">
                      <textarea
                        rows={2}
                        placeholder="Thanks for your purchase! Here's everything you need…"
                        value={d.message}
                        onChange={(e) => setDraft(p.id, { message: e.target.value })}
                        className="block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
                      />
                    </Field>

                    <Field label="Delivery time label">
                      <input
                        type="text"
                        placeholder="Instant"
                        value={d.deliveryTime}
                        onChange={(e) => setDraft(p.id, { deliveryTime: e.target.value })}
                        className="block w-full max-w-[200px] rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
                      />
                    </Field>

                    <div className="mt-5 flex items-center gap-3">
                      <button
                        onClick={() => save(p.id)}
                        disabled={savingId === p.id}
                        className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                      >
                        {savingId === p.id ? "Saving…" : "💾 Save delivery"}
                      </button>
                      {dirty && <span className="text-xs text-amber-300/80">Unsaved changes</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex justify-end">
            <button
              onClick={refreshOrders}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
            >
              ↻ Refresh
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
              No orders yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/45">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((o) => (
                    <tr key={o.id} className="text-white/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{o.productTitle}</div>
                        <div className="text-[11px] text-white/40">{o.id}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{o.channel}</td>
                      <td className="px-4 py-3 text-white/60">
                        {o.channel === "email"
                          ? o.email ?? "—"
                          : o.telegramChatId
                            ? `chat ${o.telegramChatId}`
                            : o.telegramHandle ?? "not connected"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deliverNow(o.id, o.status === "delivered")}
                          disabled={busyOrder === o.id}
                          className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
                        >
                          {busyOrder === o.id
                            ? "…"
                            : o.status === "delivered"
                              ? "Resend"
                              : "Deliver now"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], string> = {
    pending: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    paid: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    delivered: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    failed: "border-rose-400/30 bg-rose-500/10 text-rose-300",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${map[status]}`}
    >
      {status}
    </span>
  );
}
