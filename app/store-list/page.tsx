import { listStores } from "@/lib/stores";
import StoreFilters from "@/components/StoreFilters";
import ServiceSection from "@/components/ServiceSection";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Store List & Service — RefundGod",
  description:
    "Our refund service explained, plus the full store list across USA, Canada, EU and UK with price limits, item limits, fees and timeframes.",
};

const RULES_BLOCKS = [
  {
    n: "01",
    h: "Confirm your cart",
    body:
      "Order your items from one of the stores below. To ensure a smooth process and peace of mind, please confirm with us your cart before placing an order.",
    tint: "amber" as const,
  },
  {
    n: "02",
    h: "Hold the originals",
    body:
      "Please don't activate electronics, or throw away packages during the process. It is always advised to hold on to original items, in case an unexpected situation may occur.",
    tint: "violet" as const,
  },
  {
    n: "03",
    h: "Pay within 48h",
    body:
      "Once your order ships or delivers, we do our job. Once you receive a confirmation from the store regarding your refund, please pay our service fee within 48 hours.",
    tint: "cyan" as const,
  },
  {
    n: "04",
    h: "Minimum 100",
    body:
      "Our minimum fee is 100! Meaning the minimum amount you pay us no matter the order value is 100 in whatever currency your order is.",
    tint: "fuchsia" as const,
  },
];

export default async function StoreListPage() {
  const stores = await listStores();

  return (
    <div className="relative">
      {/* Galaxy backdrop is mounted site-wide in layout.tsx — no
          per-page canvases. */}

      {/* Multi-act intro */}
      <ServiceSection />

      {/* Divider with editorial chapter mark */}
      <div className="container-wide pt-8 pb-2">
        <div className="mx-auto h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {/* Store list intro — solid backdrop card so the headline POPS */}
      <section
        id="storelist"
        className="relative scroll-mt-16 py-20 sm:py-28"
      >
        <div aria-hidden="true" className="pointer-events-none absolute right-[6%] top-1/2 -translate-y-1/2 hidden lg:block">
          <ParallaxIllustration kind="store" accent="amber" size={320} />
        </div>
        <div className="container-wide relative">
          <div
            className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/10 px-8 py-12 text-center sm:px-14 sm:py-16"
            style={{
              background:
                "linear-gradient(160deg, rgba(15,10,30,0.85), rgba(8,6,18,0.92))",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 40px 120px -40px rgba(0,0,0,0.85)",
            }}
          >
            <p
              className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-300 sm:text-sm"
              style={{ textShadow: "0 0 24px rgba(245,185,69,0.5)" }}
            >
              — chapter 05 / curated · 480+ stores
            </p>
            <KineticText
              as="h2"
              text="The Store List"
              className="editorial-display mt-6 text-white text-[clamp(2.5rem,10vw,9rem)] uppercase"
              style={{ textShadow: "0 4px 40px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.95)" }}
            />
            <Reveal delay={0.4}>
              <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/95">
                Filter by region, search by name, and see live limits, fees and
                timeframes. Join our channels for the latest store drops.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Rules — glass cards in 4-up grid */}
      <section className="relative py-12">
        <div className="container-wide relative">
          <Reveal>
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300/85">
              — the rules
            </p>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {RULES_BLOCKS.map((b, i) => (
              <GlassCard key={b.n} tint={b.tint} delay={i * 0.08}>
                <div className="p-6 sm:p-7">
                  <div className="heading-display text-aurora text-5xl font-bold leading-none tracking-tight">
                    {b.n}
                  </div>
                  <h3 className="heading-display mt-3 text-lg font-bold uppercase tracking-tight text-white">
                    {b.h}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-white/85">
                    {b.body}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Non-payment + payment — magazine 2/3 + 1/3 */}
      <section className="relative py-12">
        <div className="container-wide relative grid gap-5 lg:grid-cols-3">
          <GlassCard tint="rose" className="lg:col-span-2">
            <div className="relative overflow-hidden p-8 sm:p-10">
              <div className="pointer-events-none absolute -right-6 -top-6 opacity-25">
                <ParallaxIllustration kind="shield" accent="rose" size={160} />
              </div>
              <h3 className="relative heading-display text-2xl font-bold uppercase tracking-tight text-rose-100">
                Non-payment disclaimer
              </h3>
              <p className="relative mt-4 text-base leading-relaxed text-white/85">
                Failure to pay our service fee within the agreed timeframe will
                result in a rebill and pursuit of legal action by the company
                and local authorities, with all documentation and evidence
                supporting this activity. We have automated scripts that inform
                us of pending orders awaiting payment. Given our service is
                constructed to help you, it is only fair to treat us with a
                little gratitude in return.
              </p>
            </div>
          </GlassCard>
          <GlassCard tint="emerald">
            <div className="relative overflow-hidden p-8 sm:p-10">
              <div className="pointer-events-none absolute -right-6 -top-6 opacity-25">
                <ParallaxIllustration kind="encryption" accent="emerald" size={140} />
              </div>
              <h3 className="relative heading-display text-2xl font-bold uppercase tracking-tight text-emerald-100">
                Payment
              </h3>
              <p className="relative mt-4 text-base leading-relaxed text-white/85">
                We accept ALL cryptocurrencies as payment.
              </p>
              <p className="relative mt-3 text-base leading-relaxed text-white/85">
                Don&apos;t see a store you&apos;re interested in below? We&apos;d be more than
                happy to try it out for you, for a discounted rate!
              </p>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="relative py-20" id="region">
        <div className="container-wide relative">
          <div
            className="mb-10 rounded-[2rem] border border-white/10 px-6 py-8 sm:px-10 sm:py-10"
            style={{
              background:
                "linear-gradient(160deg, rgba(15,10,30,0.78), rgba(8,6,18,0.88))",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <div className="grid items-end gap-6 sm:grid-cols-[1fr_auto]">
              <div>
                <p
                  className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-300"
                  style={{ textShadow: "0 0 24px rgba(245,185,69,0.5)" }}
                >
                  — chapter 06 / browse
                </p>
                <KineticText
                  as="h2"
                  text="Select your region."
                  className="editorial-display mt-5 text-white text-[clamp(2rem,6vw,5rem)] uppercase"
                  style={{ textShadow: "0 4px 30px rgba(0,0,0,0.85)" }}
                />
              </div>
              <p className="max-w-xs text-sm text-white/90">
                One region at a time. Search across name, category and notes.
              </p>
            </div>
          </div>
          <StoreFilters stores={stores} />
        </div>
      </section>
    </div>
  );
}
