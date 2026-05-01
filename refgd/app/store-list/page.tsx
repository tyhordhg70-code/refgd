import { listStores } from "@/lib/stores";
import StoreFilters from "@/components/StoreFilters";
import {
  getAllCategoriesMerged,
  getExtraCategories,
  CANNED_CATEGORIES,
} from "@/lib/categories-store";
import ServiceSection from "@/components/ServiceSection";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import ParallaxChapter from "@/components/ParallaxChapter";
import { Reveal } from "@/components/Reveal";
import { ReorderableContainer, ReorderableSection } from "@/components/ReorderableSection";
import EditableText from "@/components/EditableText";
import ChapterPill from "@/components/ChapterPill";
import LedTicker from "@/components/LedTicker";
import LedJoySection from "@/components/LedJoySection";
import SceneActivator from "@/components/SceneActivator";
import MagneticButton from "@/components/MagneticButton";

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
  const [stores, initialCategories, initialExtras] = await Promise.all([
    listStores(),
    getAllCategoriesMerged(),
    getExtraCategories(),
  ]);

  return (
    <>
      <ReorderableContainer pageId="store-list">
        {/* Activate the worker's "store" scene (calm ambient nebula
            with subtle drift) for as long as this page is mounted.
            Renders into the shared WebGL canvas behind everything. */}
        <SceneActivator name="store" />

        {/* Act 1 — "Get rewarded for shopping online." HERO ONLY.
            Shrunk so the headline + scene fit comfortably in a single
            desktop viewport. The rest of the ServiceSection acts (Stop
            wasting time → How it works → Why choose us → Lock → Awarded
            CTA) are mounted further down via slice="rest" so the LED
            joy moment can sit DIRECTLY between them. */}
        <ReorderableSection sectionId="service-intro-hero">
          <ServiceSection slice="hero" />
        </ReorderableSection>

        {/* "Ahhh, feel the joy of cashback" — the LED beat is now
            literally between the hero and Act 2, exactly where the
            scroll narrative wants it. */}
        <ReorderableSection sectionId="led-joy">
          <LedJoySection />
        </ReorderableSection>

        {/* Acts 2-5 + Lock centerpiece — "Stop wasting time" → "How it
            works" → "Why choose us" → Lock → Awarded CTA. */}
        <ReorderableSection sectionId="service-intro-rest">
          <ServiceSection slice="rest" />
        </ReorderableSection>

        <ReorderableSection sectionId="led-ticker">
          {/* LED ticker — broadcast-style amber LED bar showcasing the
              live offerings. Pauses on hover so visitors can read it. */}
          <div className="py-6">
            <LedTicker
              accent="#f5b945"
              items={[
                "+480 stores active",
                "USA · Canada · EU · UK",
                "Stealth Identities Available",
                "Cashback up to 100%",
                "Lifetime support included",
                "Crypto only — full anonymity",
                "New drops every week",
              ]}
            />
          </div>
        </ReorderableSection>

        <ReorderableSection sectionId="divider">
          {/* Divider with editorial chapter mark */}
          <div className="container-wide pt-8 pb-2">
            <div className="mx-auto h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
        </ReorderableSection>

        <ReorderableSection sectionId="storelist-hero">
          {/* Store list intro — solid backdrop card so the headline POPS,
              wrapped in a parallax chapter for scroll-depth on the
              headline itself. */}
          <ParallaxChapter intensity={0.5} className="scroll-mt-16 py-20 sm:py-28">
            <section id="storelist" className="relative">
              <div className="container-wide relative">
                <div
                  className="mx-auto max-w-2xl rounded-[2.5rem] border border-white/15 px-6 py-8 text-center sm:px-10 sm:py-10"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(15,10,30,0.95), rgba(8,6,18,0.98))",
                    backdropFilter: "blur(16px) saturate(120%)",
                    WebkitBackdropFilter: "blur(16px) saturate(120%)",
                    boxShadow:
                      "0 40px 120px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  <ChapterPill
                    editId="storelist.hero.eyebrow"
                    defaultValue="chapter 05 / curated · 480+ stores"
                    accent="amber"
                    size="md"
                  />
                  <KineticText
                    as="h2"
                    editId="storelist.hero.title"
                    text="The Store List"
                    className="editorial-display mt-6 text-white text-[clamp(2.5rem,10vw,9rem)] uppercase"
                    style={{ textShadow: "0 4px 40px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.95)" }}
                  />
                  <Reveal delay={0.4}>
                    <EditableText
                      id="storelist.hero.body"
                      defaultValue="Filter by region, search by name, and see live limits, fees and timeframes. Join our channels for the latest store drops."
                      as="p"
                      multiline
                      className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/95"
                    />
                  </Reveal>
                </div>
              </div>
            </section>
          </ParallaxChapter>
        </ReorderableSection>

        <ReorderableSection sectionId="rules">
          {/* Rules — glass cards in 4-up grid, parallax 3D scroll depth.
              Cards now reveal Lusion-style: 100px translate-up + scale
              0.92→1 + opacity 0→1 with 1.2s lusion ease and 0.12s
              stagger between cards. */}
          <ParallaxChapter intensity={0.35} className="py-8">
            <section className="relative">
              <div className="container-wide relative">
                <Reveal>
                  <EditableText
                    id="storelist.rules.eyebrow"
                    defaultValue="— the rules"
                    as="p"
                    className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300/85"
                  />
                </Reveal>
                <div className="mx-auto mt-8 grid max-w-6xl justify-items-center gap-5 md:grid-cols-2 lg:grid-cols-4 lg:justify-items-stretch">
                  {RULES_BLOCKS.map((b, i) => (
                    <GlassCard
                      key={b.n}
                      index={i}
                      tint={b.tint}
                      delay={i * 0.12}
                      className="liquid-glass w-full max-w-md"
                    >
                      <div className="p-6 sm:p-7">
                        <div className="heading-display text-aurora text-5xl font-bold leading-none tracking-tight">
                          {b.n}
                        </div>
                        <EditableText
                          id={`storelist.rule.${b.n}.h`}
                          defaultValue={b.h}
                          as="h3"
                          className="heading-display mt-3 text-lg font-bold uppercase tracking-tight text-white"
                        />
                        <EditableText
                          id={`storelist.rule.${b.n}.body`}
                          defaultValue={b.body}
                          as="p"
                          multiline
                          className="mt-3 text-sm font-medium leading-relaxed text-white/95"
                        />
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </section>
          </ParallaxChapter>
        </ReorderableSection>

        <ReorderableSection sectionId="payment-info">
          {/* Non-payment + payment — magazine 2/3 + 1/3, parallax depth */}
          <ParallaxChapter intensity={0.4} className="py-8">
            <section className="relative">
              <div className="container-wide relative grid gap-5 lg:grid-cols-3">
                <GlassCard tint="rose" index={0} className="lg:col-span-2">
                  <div className="relative overflow-hidden p-8 sm:p-10">
                    <EditableText
                      id="storelist.nonpay.title"
                      defaultValue="Non-payment disclaimer"
                      as="h3"
                      className="relative heading-display text-2xl font-bold uppercase tracking-tight text-rose-100"
                    />
                    <EditableText
                      id="storelist.nonpay.body"
                      defaultValue="Failure to pay our service fee within the agreed timeframe will result in a rebill and pursuit of legal action by the company and local authorities, with all documentation and evidence supporting this activity. We have automated scripts that inform us of pending orders awaiting payment. Given our service is constructed to help you, it is only fair to treat us with a little gratitude in return."
                      as="p"
                      multiline
                      className="relative mt-4 text-base leading-relaxed text-white/95"
                    />
                  </div>
                </GlassCard>
                <GlassCard tint="emerald" index={1} delay={0.15}>
                  <div className="relative grid items-center gap-6 overflow-hidden p-8 sm:p-10 sm:grid-cols-[auto_1fr]">
                    <div className="hidden sm:block">
                      <img
                        src="/uploads/payment-pay.png"
                        alt="A user tapping PAY on their phone"
                        loading="lazy"
                        decoding="async"
                        className="payment-pay-img h-[170px] w-[170px] object-contain"
                        style={{
                          filter:
                            "drop-shadow(0 25px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(52,211,153,0.4))",
                        }}
                      />
                    </div>
                    <div>
                      <EditableText
                        id="storelist.pay.title"
                        defaultValue="Payment"
                        as="h3"
                        className="relative heading-display text-2xl font-bold uppercase tracking-tight text-emerald-100"
                      />
                      <EditableText
                        id="storelist.pay.body1"
                        defaultValue="We accept ALL cryptocurrencies as payment."
                        as="p"
                        multiline
                        className="relative mt-4 text-base leading-relaxed text-white/95"
                      />
                      <EditableText
                        id="storelist.pay.body2"
                        defaultValue="Don't see a store you're interested in below? We'd be more than happy to try it out for you, for a discounted rate!"
                        as="p"
                        multiline
                        className="relative mt-3 text-base leading-relaxed text-white/95"
                      />
                    </div>
                    <div className="mt-6 flex justify-center sm:hidden">
                      <img
                        src="/uploads/payment-pay.png"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="payment-pay-img h-[150px] w-[150px] object-contain"
                        style={{
                          filter:
                            "drop-shadow(0 25px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(52,211,153,0.4))",
                        }}
                      />
                    </div>
                  </div>
                </GlassCard>
              </div>
            </section>
          </ParallaxChapter>
        </ReorderableSection>

        <ReorderableSection sectionId="filter-grid">
          {/* Filters + grid — final chapter, parallax. */}
          <ParallaxChapter intensity={0.45} className="pt-6 pb-20">
            <section className="relative" id="region">
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
                      <ChapterPill
                        editId="storelist.region.eyebrow"
                        defaultValue="chapter 06 / browse"
                        accent="amber"
                        size="md"
                      />
                      <KineticText
                        as="h2"
                        editId="storelist.region.title"
                        text="Select your region."
                        className="editorial-display mt-5 text-white text-[clamp(2rem,6vw,5rem)] uppercase"
                        style={{ textShadow: "0 4px 30px rgba(0,0,0,0.85)" }}
                      />
                    </div>
                    <EditableText
                      id="storelist.region.note"
                      defaultValue="One region at a time. Search across name, category and notes."
                      as="p"
                      multiline
                      className="max-w-xs text-sm text-white/90"
                    />
                  </div>
                </div>
                <StoreFilters
                  stores={stores}
                  initialCategories={initialCategories}
                  initialExtras={initialExtras}
                  initialCanned={CANNED_CATEGORIES as unknown as string[]}
                />
              </div>
            </section>
          </ParallaxChapter>
        </ReorderableSection>

        {/* ────────── Closing chapter — guarantees there is no dead space
            between the filter grid and the footer. Earlier the page just
            ended on the StoreFilters bottom edge so it read as "blank
            after the storelist". This is a parallax CTA banner with the
            same Awarded-style treatment used on the home page. */}
        <ReorderableSection sectionId="storelist-outro">
          <ParallaxChapter intensity={0.4} className="pb-20 pt-8">
            <section className="container-wide">
              <Reveal>
                <div
                  className="pulse-glow relative overflow-hidden rounded-[2.5rem] border border-amber-400/40 p-10 text-center sm:p-16"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(40,22,4,0.9) 0%, rgba(20,12,4,0.94) 100%)",
                    backdropFilter: "blur(16px) saturate(140%)",
                    WebkitBackdropFilter: "blur(16px) saturate(140%)",
                    boxShadow:
                      "0 50px 140px -30px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                  <EditableText
                    id="storelist.outro.eyebrow"
                    defaultValue="— ready when you are"
                    as="p"
                    className="heading-display text-[10px] font-semibold uppercase tracking-[0.5em] text-amber-200 sm:text-xs"
                    style={{ textShadow: "0 0 18px rgba(245,185,69,0.55)" }}
                  />
                  <KineticText
                    as="h2"
                    editId="storelist.outro.title"
                    text="Don't see your store? We'll get it."
                    className="editorial-display mt-4 mx-auto max-w-4xl text-balance text-white text-3xl uppercase sm:text-5xl md:text-6xl"
                    style={{ textShadow: "0 4px 30px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.85)", lineHeight: 1.02 }}
                  />
                  <EditableText
                    id="storelist.outro.body"
                    defaultValue="Send us the store you're after — most requests are added to the live list within 48 hours. Lifetime updates, encrypted handoff, and full anonymity baked in."
                    as="p"
                    multiline
                    className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white"
                    style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}
                  />
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <MagneticButton href="https://t.me/refundlawfirm" external variant="primary">
                      Request a store
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                      </svg>
                    </MagneticButton>
                    <MagneticButton
                      href="https://cryptpad.fr/form/#/2/form/view/8G2YtzZK21kTYT4Hib0yja1VVoh2Q+3dPhBMKQtH37w/"
                      external
                      variant="ghost"
                    >
                      Submit your order
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                      </svg>
                    </MagneticButton>
                  </div>
                </div>
              </Reveal>
            </section>
          </ParallaxChapter>
        </ReorderableSection>

      </ReorderableContainer>
    </>
  );
}
