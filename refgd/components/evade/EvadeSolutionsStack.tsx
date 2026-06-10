"use client";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import KineticText from "@/components/KineticText";
import SafeReveal from "@/components/SafeReveal";
import HudEyebrow from "./HudEyebrow";
import CyberGlyph, { type CyberGlyphKind } from "./CyberGlyph";

const SOLUTIONS: { id: string; tag: string; body: string; tint: "amber" | "cyan" | "violet"; rgb: string; illo: CyberGlyphKind; kind: "swingIn" | "swingInR" }[] = [
  { id: "evade.solution.0", tag: "ANTI-AGING",          body: "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.", tint: "amber",  rgb: "245,185,69",  illo: "radar",       kind: "swingIn"  },
  { id: "evade.solution.1", tag: "ANTI-REBILL",         body: "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.", tint: "cyan", rgb: "34,211,238", illo: "nodemesh",   kind: "swingIn"  },
  { id: "evade.solution.2", tag: "ANTI-IDENTIFICATION", body: "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to $10,000.", tint: "violet", rgb: "167,139,250", illo: "fingerprint", kind: "swingInR" },
];

/**
 * EvadeSolutionsStack — chapter 2, redesigned as a DEFENSE-IN-DEPTH stack.
 *
 * The three countermeasures are no longer three identical glass cards in
 * a row; they're stacked defense LAYERS connected by a vertical spine,
 * each progressively inset to imply depth, with a cyber glyph and mono
 * layer code. The lead (heading + body + sol-locks art) is frameless.
 *
 * Preserved editIds: evade.ch2.eyebrow / .title / .body, the image
 * evade.art.solLocks, and evade.solution.0/1/2 (bodies byte-identical).
 */
export default function EvadeSolutionsStack() {
  return (
    <section className="relative z-10 pt-8 pb-20 sm:pt-12 sm:pb-28">
      <div className="container-wide relative">
        {/* ── Lead: frameless heading + intro + art ── */}
        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)] lg:gap-14">
          <SafeReveal kind="lift" duration={1.0}>
            <HudEyebrow editId="evade.ch2.eyebrow" defaultValue="chapter 02 / solutions" accent="violet" />
            <KineticText
              as="h2"
              text="Our comprehensive solutions."
              editId="evade.ch2.title"
              className="editorial-display mt-7 max-w-2xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.6rem)]"
              style={{ textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)", letterSpacing: "-0.025em", lineHeight: 1.12 }}
            />
            <div className="mt-6 max-w-lg border-l-2 border-violet-400/50 pl-5">
              <EditableText
                id="evade.ch2.body"
                defaultValue="Three layered countermeasures — anti-aging, anti-rebill, and anti-identification — built from the same intelligence the stores' fraud teams use against you. Each one closes a specific door the system uses to flag, throttle, or ban your account."
                as="p"
                multiline
                className="text-base leading-relaxed text-white/90 sm:text-lg"
              />
            </div>
          </SafeReveal>

          <SafeReveal className="relative" kind="swingInR" delay={0.15} duration={1.15}>
            <div className="relative mx-auto w-full max-w-[380px]">
              <span aria-hidden className="pointer-events-none absolute inset-x-8 -bottom-4 h-14 rounded-[100%]"
                style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(167,139,250,0.5), transparent 70%)", filter: "blur(24px)" }} />
              <EditableImage
                id="evade.art.solLocks"
                defaultSrc="/uploads/sol-locks.webp"
                alt="Security solutions — checklist, shields, locks."
                wrapperClassName="relative block mx-auto w-full"
                className="mx-auto block h-auto w-full object-contain drop-shadow-[0_30px_70px_rgba(167,139,250,0.45)]"
              />
            </div>
          </SafeReveal>
        </div>

        {/* ── Defense layers (connected spine, depth-inset) ── */}
        <div className="relative mt-14 sm:mt-16">
          {/* vertical spine */}
          <span aria-hidden className="pointer-events-none absolute left-4 top-2 bottom-2 hidden w-px sm:block"
            style={{ background: "linear-gradient(180deg, rgba(245,185,69,0.5), rgba(34,211,238,0.5), rgba(167,139,250,0.5))" }} />

          <div className="flex flex-col gap-5">
            {SOLUTIONS.map((s, i) => (
              <SafeReveal key={s.id} className="relative" kind={s.kind} delay={0.1 + i * 0.1} duration={1.0}>
                <div
                  className="group relative ml-0 overflow-hidden rounded-xl border p-6 sm:ml-12 sm:p-7"
                  style={{
                    background: `linear-gradient(110deg, rgba(${s.rgb},0.12), rgba(8,10,20,0.7) 55%)`,
                    borderColor: `rgba(${s.rgb},0.3)`,
                    boxShadow: `inset 0 0 0 1px rgba(${s.rgb},0.08), 0 24px 70px -32px rgba(0,0,0,0.85)`,
                  }}
                >
                  {/* spine node */}
                  <span aria-hidden className="absolute -left-[34px] top-8 hidden h-3 w-3 -translate-x-1/2 rounded-full sm:block"
                    style={{ background: `rgba(${s.rgb},1)`, boxShadow: `0 0 16px rgba(${s.rgb},0.85)` }} />
                  {/* connector */}
                  <span aria-hidden className="absolute -left-9 top-[38px] hidden h-px w-9 sm:block"
                    style={{ background: `rgba(${s.rgb},0.6)` }} />

                  <div className="flex items-start gap-5">
                    <div className="shrink-0">
                      <CyberGlyph kind={s.illo} accent={s.tint} size={68} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.28em]"
                          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', color: `rgba(${s.rgb},0.95)` }}
                        >
                          LAYER {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, rgba(${s.rgb},0.4), transparent)` }} aria-hidden />
                        <span
                          className="rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
                          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', color: `rgba(${s.rgb},0.9)`, borderColor: `rgba(${s.rgb},0.35)` }}
                        >
                          {s.tag}
                        </span>
                      </div>
                      <EditableText id={s.id} defaultValue={s.body} as="p" multiline
                        className="text-base leading-relaxed text-white/95" />
                    </div>
                  </div>
                </div>
              </SafeReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
