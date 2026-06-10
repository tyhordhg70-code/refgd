"use client";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import SafeReveal from "@/components/SafeReveal";
import HudEyebrow from "./HudEyebrow";

const TRUST = [
  { id: 0, title: "Why trust us",  body: "We are an experienced team of cyber security developers, who initially established our presence on the dark web. During the summer of 2019 we had been solely relying on selling on Amazon, when a significant setback was encountered. Despite all attempts to address the issue with Amazon, only generic responses from OFM were received indicating policy non-compliance, leading to the suspension of not only my account but also those of close friends and family members.", rgb: "34,211,238",  glyph: "◆" },
  { id: 1, title: "The setback",   body: "This turn of events was deeply distressing, as Amazon constituted a substantial portion of our business at the time. Undeterred, we persevered through numerous trials and errors, eventually discovering a secure and effective method to regain access to Amazon and PayPal, enabling us to resume selling. Motivated by this experience, we decided to share the hard-earned knowledge with others — resulting in the creation of the highly sought-after guide, which became the go-to resource for navigating other stores' suspension protocols.", rgb: "167,139,250", glyph: "▲" },
  { id: 2, title: "The aftermath", body: "For the following six months — after getting our seller account up and running — we dedicated extensive time and effort to developing effective strategies for safely and easily creating multiple Amazon accounts without the risk of being linked and blocked, which soon led to research of other stores and how their algorithms work as well.", rgb: "245,185,69",  glyph: "●" },
];

/**
 * EvadeTrustSplit — chapter "reputation", redesigned as an INCIDENT-LOG
 * TIMELINE. The trust story is already chronological (2019 suspension →
 * recovery → aftermath), so it's rendered as a vertical case file: a
 * spine with status nodes, monospace log indices, and the client-reviews
 * art presented as an "exhibit" panel. No repeated glass card.
 *
 * Preserved ids: evade.ch3.eyebrow / .title, evade.divider.trustReviews
 * (identical defaultSrc + alt) and evade.trust.{i}.title / .body.
 */
export default function EvadeTrustSplit() {
  return (
    <section className="relative z-10 py-20 sm:py-28">
      <div className="container-wide">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16">
          {/* ── Left: heading + evidence exhibit ── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SafeReveal kind="lift" duration={1.0}>
              <HudEyebrow editId="evade.ch3.eyebrow" defaultValue="chapter 03 / reputation" accent="amber" />
              <EditableText
                id="evade.ch3.title"
                defaultValue="Why trust us."
                as="h2"
                className="editorial-display mt-6 max-w-md text-balance uppercase text-white text-[clamp(2rem,5vw,3.6rem)]"
                style={{ textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)", letterSpacing: "-0.025em", lineHeight: 1.12 }}
              />
            </SafeReveal>

            <SafeReveal kind="flip3d" delay={0.15} duration={1.1} className="mt-8">
              <figure className="relative">
                <div
                  className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.26em] text-amber-200/70"
                  style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                  aria-hidden
                >
                  <span>exhibit&nbsp;a&nbsp;//&nbsp;client&nbsp;reviews</span>
                  <span className="text-emerald-300/70">verified</span>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-white/12 p-3"
                  style={{ background: "linear-gradient(165deg, rgba(245,185,69,0.10), rgba(8,10,20,0.7) 60%)" }}>
                  {(["tl", "tr", "bl", "br"] as const).map((p) => (
                    <span key={p} aria-hidden className="absolute z-10 h-5 w-5 border-amber-200/50"
                      style={{
                        top: p[0] === "t" ? 6 : undefined, bottom: p[0] === "b" ? 6 : undefined,
                        left: p[1] === "l" ? 6 : undefined, right: p[1] === "r" ? 6 : undefined,
                        borderTopWidth: p[0] === "t" ? 2 : 0, borderBottomWidth: p[0] === "b" ? 2 : 0,
                        borderLeftWidth: p[1] === "l" ? 2 : 0, borderRightWidth: p[1] === "r" ? 2 : 0,
                        borderStyle: "solid",
                      }} />
                  ))}
                  <EditableImage
                    id="evade.divider.trustReviews"
                    defaultSrc="/uploads/trust-reviews.webp"
                    alt="Star reviews — clients trust RefundGod."
                    wrapperClassName="relative block w-full"
                    className="block h-auto w-full rounded-lg object-contain"
                  />
                </div>
              </figure>
            </SafeReveal>
          </div>

          {/* ── Right: incident-log timeline ── */}
          <div className="relative">
            {/* spine */}
            <span aria-hidden className="pointer-events-none absolute left-[14px] top-3 bottom-3 w-px sm:left-[18px]"
              style={{ background: "linear-gradient(180deg, rgba(34,211,238,0.6), rgba(167,139,250,0.6), rgba(245,185,69,0.6))" }} />
            <div className="flex flex-col gap-7">
              {TRUST.map((t, i) => (
                <SafeReveal key={t.id} kind="slideRight" delay={0.1 + i * 0.12} duration={0.95} className="relative pl-12 sm:pl-16">
                  {/* node */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-1 grid h-9 w-9 place-items-center rounded-full border text-sm sm:h-10 sm:w-10"
                    style={{
                      borderColor: `rgba(${t.rgb},0.55)`,
                      background: `radial-gradient(circle at 50% 35%, rgba(${t.rgb},0.35), rgba(8,10,20,0.95))`,
                      color: `rgba(${t.rgb},1)`,
                      boxShadow: `0 0 18px rgba(${t.rgb},0.5)`,
                    }}
                  >
                    {t.glyph}
                  </span>

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
                    style={{ boxShadow: `inset 2px 0 0 rgba(${t.rgb},0.7)` }}>
                    <div className="mb-2 flex items-center gap-3">
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.26em]"
                        style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', color: `rgba(${t.rgb},0.95)` }}
                        aria-hidden
                      >
                        LOG&nbsp;{String(i + 1).padStart(2, "0")}
                      </span>
                      <span aria-hidden className="h-px flex-1" style={{ background: `linear-gradient(90deg, rgba(${t.rgb},0.4), transparent)` }} />
                    </div>
                    <EditableText
                      id={`evade.trust.${i}.title`}
                      defaultValue={t.title}
                      as="h3"
                      className="heading-display text-xl font-bold uppercase tracking-tight text-white sm:text-2xl"
                      style={{ lineHeight: 1.2 }}
                    />
                    <EditableText
                      id={`evade.trust.${i}.body`}
                      defaultValue={t.body}
                      as="p"
                      multiline
                      className="mt-3 text-[15px] leading-[1.8] text-white/90"
                    />
                  </div>
                </SafeReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
