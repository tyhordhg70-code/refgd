"use client";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import KineticText from "@/components/KineticText";
import SafeReveal from "@/components/SafeReveal";
import HudEyebrow from "./HudEyebrow";

const PRICING = [
  {
    title: "Stealth / OpSEC + Rebill Bypass",
    body:  "Remain fully anonymous while surfing online, place orders under a forged identity, never face a rebill again — and much more.",
    url:   "https://refundgod.bgng.io/product/stealth-opsec-guide-rebill-bypass-guide",
    rgb:   "34,211,238",
    img:   "/uploads/stealth-opsec.png",
    kind:  "fanLeft"  as const,
    clr:   "L2",
  },
  {
    title: "Evasion Book — Level 1",
    body:  "For those who want a serious long-term solution and to hit big ordering from multiple accounts at once before the store has a chance to detect and ban you. Stay under the radar, pass through account reviews and more. 45 pages with no filler content.",
    url:   "https://refundgod.bgng.io/product/evade1",
    rgb:   "245,185,69",
    img:   "/uploads/evasion-l1.webp",
    kind:  "fan"      as const,
    clr:   "L3",
  },
  {
    title: "Evasion Book — Level 2",
    body:  "For those just starting out with limited experience. Quick and easy solutions with free and paid alternatives. 10+ pages with lifetime support.",
    url:   "https://refundgod.bgng.io/product/evasion-book---level-2",
    rgb:   "167,139,250",
    img:   "/uploads/evasion-l2.png",
    kind:  "fanRight" as const,
    clr:   "L1",
  },
];

/**
 * EvadePricingShowcase — redesigned as ACCESS / CLEARANCE TIERS.
 *
 * Keeps the three-column comparison (no horizontal scroll) but trades
 * the rounded-[2rem] glass card + giant number watermark for an angular
 * HUD tier card: a scanning top strip, a monospace clearance badge,
 * corner brackets, the product on a reticle plinth, and the original
 * CTA. The middle tier is flagged as recommended.
 *
 * Preserved: section id="Learn", evade.ch4.eyebrow / .title, every
 * evade.pricing.{i}.img / .title / .body (identical defaultValues +
 * defaultSrc + alt={title}), product hrefs, and the "Shop Methods" CTA.
 */
export default function EvadePricingShowcase() {
  return (
    <section className="relative z-10 py-24" id="Learn">
      <div className="container-wide relative">
        <div className="flex flex-col items-start gap-5">
          <HudEyebrow editId="evade.ch4.eyebrow" defaultValue="Get started, today" accent="amber" />
          <KineticText
            as="h2"
            text="Our pricing — select your plan."
            editId="evade.ch4.title"
            className="editorial-display max-w-4xl text-balance uppercase text-white text-[clamp(2rem,5.6vw,4.4rem)]"
            style={{
              textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
              letterSpacing: "-0.025em",
            }}
          />
        </div>

        <div className="mt-12 grid items-stretch gap-7 md:grid-cols-3">
          {PRICING.map((p, i) => {
            const featured = i === 1;
            return (
              <SafeReveal
                key={i}
                className="group relative flex"
                delay={0.1 + i * 0.14}
                kind={p.kind}
                duration={1.05}
              >
                <div
                  className="ev-pr-card relative flex w-full flex-col overflow-hidden rounded-xl border"
                  style={{
                    background: `linear-gradient(180deg, rgba(${p.rgb},0.12), rgba(8,10,20,0.92) 52%)`,
                    borderColor: featured ? `rgba(${p.rgb},0.55)` : "rgba(255,255,255,0.12)",
                    boxShadow: featured
                      ? `0 60px 130px -40px rgba(0,0,0,0.9), 0 0 80px -30px rgba(${p.rgb},0.6), inset 0 0 0 1px rgba(${p.rgb},0.25)`
                      : `0 40px 110px -45px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(${p.rgb},0.08)`,
                    transform: featured ? "translateZ(0)" : undefined,
                  }}
                >
                  {/* scanning top strip */}
                  <span aria-hidden className="ev-pr-scan absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: `linear-gradient(90deg, transparent, rgba(${p.rgb},1), transparent)` }} />

                  {/* corner brackets */}
                  {(["tl", "tr", "bl", "br"] as const).map((c) => (
                    <span key={c} aria-hidden className="absolute z-20 h-5 w-5"
                      style={{
                        top: c[0] === "t" ? 8 : undefined, bottom: c[0] === "b" ? 8 : undefined,
                        left: c[1] === "l" ? 8 : undefined, right: c[1] === "r" ? 8 : undefined,
                        borderTopWidth: c[0] === "t" ? 1.5 : 0, borderBottomWidth: c[0] === "b" ? 1.5 : 0,
                        borderLeftWidth: c[1] === "l" ? 1.5 : 0, borderRightWidth: c[1] === "r" ? 1.5 : 0,
                        borderStyle: "solid", borderColor: `rgba(${p.rgb},0.5)`,
                      }} />
                  ))}

                  {/* clearance header row */}
                  <div className="flex items-center justify-between px-6 pt-6"
                    style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                    <span className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: `rgba(${p.rgb},0.95)` }}>
                      Tier · 0{i + 1}
                    </span>
                    {featured ? (
                      <span className="rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-ink-950"
                        style={{ background: `rgba(${p.rgb},0.95)` }} aria-hidden>
                        recommended
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.22em] text-white/35" aria-hidden>
                        clearance {p.clr}
                      </span>
                    )}
                  </div>

                  <div className="relative flex flex-1 flex-col p-6">
                    {/* product on reticle plinth */}
                    <div className="relative mx-auto mb-5 flex h-44 w-full items-center justify-center">
                      <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-0 h-10 rounded-[100%]"
                        style={{ background: `radial-gradient(ellipse 60% 100% at 50% 0%, rgba(${p.rgb},0.5), transparent 70%)`, filter: "blur(16px)" }} />
                      <span aria-hidden className="pointer-events-none absolute inset-x-8 bottom-1 h-px"
                        style={{ background: `linear-gradient(90deg, transparent, rgba(${p.rgb},0.7), transparent)` }} />
                      <EditableImage
                        id={`evade.pricing.${i}.img`}
                        defaultSrc={p.img}
                        alt={p.title}
                        wrapperClassName="relative z-10 block max-h-full"
                        className="relative block h-auto w-auto max-w-full max-h-44 object-contain drop-shadow-[0_22px_44px_rgba(0,0,0,0.65)]"
                      />
                    </div>

                    <EditableText
                      id={`evade.pricing.${i}.title`}
                      defaultValue={p.title}
                      as="h3"
                      className="heading-display text-2xl font-bold uppercase tracking-tight text-white"
                      style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)", lineHeight: 1.2 }}
                    />
                    <span aria-hidden className="mt-3 block h-px w-12"
                      style={{ background: `linear-gradient(90deg, rgba(${p.rgb},0.95), transparent)` }} />
                    <EditableText
                      id={`evade.pricing.${i}.body`}
                      defaultValue={p.body}
                      as="p"
                      multiline
                      className="mt-4 flex-1 text-base leading-relaxed text-white/95"
                    />

                    <div className="mt-7">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-ink-950 transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                        style={{
                          background: `linear-gradient(135deg, rgba(${p.rgb},1) 0%, rgba(${p.rgb},0.85) 100%)`,
                          boxShadow: `0 18px 40px -12px rgba(${p.rgb},0.65), 0 0 30px -8px rgba(${p.rgb},0.5), inset 0 1px 0 rgba(255,255,255,0.35)`,
                        }}
                      >
                        <span className="relative">Shop Methods</span>
                        <svg className="relative transition-transform duration-200 group-hover/cta:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </SafeReveal>
            );
          })}
        </div>
      </div>

      <style>{`
        .ev-pr-scan { animation: evPrScan 3.4s ease-in-out infinite; transform-origin: left center; }
        @keyframes evPrScan { 0%,100% { opacity: 0.35; transform: scaleX(0.6) translateX(-10%); } 50% { opacity: 1; transform: scaleX(1) translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .ev-pr-scan { animation: none; opacity: 0.7; } }
      `}</style>
    </section>
  );
}
