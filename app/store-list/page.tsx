import { listStores } from "@/lib/stores";
import StoreFilters from "@/components/StoreFilters";
import ServiceSection from "@/components/ServiceSection";
import ScrollReveal3D from "@/components/ScrollReveal3D";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Store List & Service — RefundGod",
  description:
    "Our refund service explained, plus the full store list across USA, Canada, EU and UK with price limits, item limits, fees and timeframes.",
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
      {/* Section 1 — Our Service (merged from /our-service) */}
      <ServiceSection />

      {/* Divider */}
      <div className="container-px pb-2">
        <div className="mx-auto h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {/* Store list section */}
      <section
        id="storelist"
        className="container-px relative scroll-mt-16 pt-12 pb-6"
      >
        <ScrollReveal3D intensity={0.7}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85">
              Curated · 480+ stores
            </p>
            <h2 className="heading-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              The Store List
            </h2>
            <p className="mt-4 text-base text-white/70">
              Filter by region, search by name, and see live limits, fees and
              timeframes. Join our channels for the latest store drops.
            </p>
          </div>
        </ScrollReveal3D>
      </section>

      {/* Rules blocks */}
      <section className="container-px pb-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {RULES_BLOCKS.map((b, i) => (
            <ScrollReveal3D key={b.n} intensity={0.5}>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
                <div className="heading-display text-3xl font-bold text-amber-300/90">
                  {b.n}
                </div>
                <p className="mt-2 text-sm font-medium leading-relaxed text-white/80">
                  {b.body}
                </p>
              </div>
            </ScrollReveal3D>
          ))}
        </div>
      </section>

      {/* Non-payment + payment */}
      <section className="container-px pb-12">
        <div className="grid gap-4 lg:grid-cols-3">
          <ScrollReveal3D className="lg:col-span-2" intensity={0.6}>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
              <h3 className="heading-display text-lg font-bold text-rose-200">
                Non-payment disclaimer
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Failure to pay our service fee within the agreed timeframe will
                result in a rebill and pursuit of legal action by the company
                and local authorities, with all documentation and evidence
                supporting this activity. We have automated scripts that
                inform us of pending orders awaiting payment. Given our
                service is constructed to help you, it is only fair to treat
                us with a little gratitude in return.
              </p>
            </div>
          </ScrollReveal3D>
          <ScrollReveal3D intensity={0.6}>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <h3 className="heading-display text-lg font-bold text-emerald-200">
                Payment
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                We accept ALL cryptocurrencies as payment.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Don&apos;t see a store you&apos;re interested in below? We&apos;d be more than
                happy to try it out for you, for a discounted rate!
              </p>
            </div>
          </ScrollReveal3D>
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
