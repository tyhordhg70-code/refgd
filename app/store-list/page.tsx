import { listStores } from "@/lib/stores";
import StoreFilters from "@/components/StoreFilters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Refund Store List — RefundGod",
  description:
    "Browse 200+ stores across USA, Canada, EU and UK with full price limits, item limits, fees and timeframes. Filter by region, search by name.",
};

const RULES_BLOCKS = [
  {
    n: "01",
    body:
      "Order your items from one of the stores below. To ensure a smooth process and peace of mind, please confirm with us your cart before placing an order.",
  },
  {
    n: "02",
    body:
      "Please don't activate electronics, or throw away packages during the process. It is always advised to hold on to original items, in case an unexpected situation may occur.",
  },
  {
    n: "03",
    body:
      "Once your order ships or delivers, we do our job. Once you receive a confirmation from the store regarding your refund, please pay our service fee within 48 hours.",
  },
  {
    n: "04",
    body:
      "Our minimum fee is 100! Meaning the minimum amount you pay us no matter the order value is 100 in whatever currency your order is.",
  },
];

export default async function StoreListPage() {
  const stores = await listStores();
  return (
    <>
      {/* Header */}
      <section className="container-px relative pt-12 pb-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85">
            Curated · 200+ stores
          </p>
          <h1 className="heading-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Our Store List
          </h1>
          <p className="mt-4 text-base text-white/65">
            Join our channels and chat for the latest news and updates on stores!
            Filter by region, search by name, and see live limits, items, fees and timeframes.
          </p>
        </div>
      </section>

      {/* Rules blocks */}
      <section className="container-px pb-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {RULES_BLOCKS.map((b) => (
            <div
              key={b.n}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5"
            >
              <div className="heading-display text-3xl font-bold text-amber-300/90">{b.n}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Non-payment + payment */}
      <section className="container-px pb-12">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 lg:col-span-2">
            <h2 className="heading-display text-lg font-bold text-rose-200">
              Non-payment disclaimer
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Please be aware, that failure to pay our service fee within the
              agreed timeframe will result in a rebill and pursuit of legal
              action by the company and local authorities, with all
              documentation and evidence supporting this activity. We have set
              up automated scripts to inform us of pending orders that we are
              yet to collect payment from. We hope that, given our service is
              constructed to help you, it is only fair to treat us with a
              little gratitude in return.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <h2 className="heading-display text-lg font-bold text-emerald-200">Payment</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              We accept ALL cryptocurrencies as payment.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Don&apos;t see a store you&apos;re interested in below? We&apos;d be more than
              happy to try it out for you, for a discounted rate!
            </p>
          </div>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="container-px pb-24" id="region">
        <h2 className="heading-display mb-5 text-2xl font-bold tracking-tight text-white">
          Select your region
        </h2>
        <StoreFilters stores={stores} />
      </section>
    </>
  );
}
