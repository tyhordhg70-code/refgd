"use client";
  import EditableText from "@/components/EditableText";
  import EditableImage from "@/components/EditableImage";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";
  import ParallaxIllustration from "@/components/ParallaxIllustration";
  import SafeReveal from "@/components/SafeReveal";

  const SOLUTIONS = [
    { id: "evade.solution.0", body: "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.", tint: "amber",  rgb: "245,185,69",  illo: "spark"      as const, kind: "swingIn"  as const },
    { id: "evade.solution.1", body: "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.", tint: "cyan", rgb: "34,211,238", illo: "encryption" as const, kind: "swingIn"  as const },
    { id: "evade.solution.2", body: "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to \$10,000.", tint: "violet", rgb: "167,139,250", illo: "globe"   as const, kind: "swingInR" as const },
  ];

  export default function EvadeSolutionsStack() {
    return (
      <section className="relative z-10 pt-8 pb-20 sm:pt-12 sm:pb-28">
        <div className="container-wide relative">
          <div className="relative rounded-[2rem] border border-violet-400/25 px-6 py-10 sm:p-12 lg:p-14"
            style={{
              background: "linear-gradient(160deg, rgba(167,139,250,0.13), rgba(34,211,238,0.08) 50%, rgba(10,8,22,0.92))",
              boxShadow: "0 60px 140px -30px rgba(0,0,0,0.85), 0 0 90px -25px rgba(167,139,250,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.30), transparent 70%)", filter: "blur(20px)" }} />
            <span aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.22), transparent 70%)", filter: "blur(20px)" }} />

            <div className="relative">
              <ChapterPill editId="evade.ch2.eyebrow" defaultValue="chapter 02 / solutions" accent="violet" size="md" />
              <KineticText
                as="h2"
                text="Our comprehensive solutions."
                editId="evade.ch2.title"
                className="editorial-display mt-8 max-w-2xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.8rem)]"
                style={{ textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)", letterSpacing: "-0.025em", lineHeight: 1.15 }}
              />
            </div>

            {/* Vault image — right below the heading. NO backdrop-filter on inner div (avoids Safari compositor bug). */}
            <SafeReveal className="relative mt-10 sm:mt-12" kind="swingIn" delay={0.12} duration={1.1}>
              <div aria-hidden className="pointer-events-none absolute -inset-10 rounded-[3rem] opacity-50"
                style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(34,211,238,0.14), transparent 70%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(245,185,69,0.08), transparent 70%)", filter: "blur(40px)" }} />
              <div className="relative rounded-[2.25rem] p-[1.5px]"
                style={{ background: "linear-gradient(135deg, rgba(245,185,69,0.55) 0%, rgba(34,211,238,0.45) 35%, rgba(167,139,250,0.35) 70%, rgba(245,185,69,0.55) 100%)" }}>
                <div className="relative overflow-hidden rounded-[calc(2.25rem-1.5px)]"
                  style={{ background: "linear-gradient(165deg, rgba(16,12,32,0.92) 0%, rgba(8,6,18,0.98) 60%, rgba(12,8,28,0.95) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 60px 140px -30px rgba(0,0,0,0.95)" }}>
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <div className="flex items-center justify-center px-6 py-10 sm:px-12 sm:py-14">
                    <EditableImage
                      id="evade.intro.vault"
                      defaultSrc="/uploads/evade-vault.webp"
                      alt="Evade — vault art"
                      wrapperClassName="relative block w-full max-w-[680px]"
                      className="block h-auto w-full object-contain drop-shadow-[0_30px_60px_rgba(34,211,238,0.35)]"
                    />
                  </div>
                </div>
              </div>
            </SafeReveal>
          </div>

          {/* Solution cards — swingIn/swingInR 3-D perspective entrance */}
          <div className="relative mt-10 grid gap-6 lg:grid-cols-3 lg:gap-7">
            {SOLUTIONS.map((s, i) => (
              <SafeReveal key={s.id} className="relative" kind={s.kind} delay={0.1 + i * 0.13} duration={1.0}>
                <div className="relative h-full overflow-hidden rounded-[1.75rem] border p-8 pt-10"
                  style={{ background: `linear-gradient(160deg, rgba(${s.rgb},0.18), rgba(10,8,22,0.88))`, borderColor: `rgba(${s.rgb},0.35)`, boxShadow: `0 40px 100px -20px rgba(0,0,0,0.85), 0 0 60px -20px rgba(${s.rgb},0.40)` }}>
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-[1.75rem]"
                    style={{ background: `linear-gradient(90deg, transparent, rgba(${s.rgb},0.9) 50%, transparent)` }} />
                  <div className="pointer-events-none absolute right-4 top-4 h-28 w-28 opacity-20" aria-hidden="true">
                    <ParallaxIllustration kind={s.illo} accent={s.tint} size={108} />
                  </div>
                  <div aria-hidden className="editorial-display mb-4 text-3xl font-black leading-none"
                    style={{ color: `rgba(${s.rgb},0.9)`, textShadow: `0 0 20px rgba(${s.rgb},0.5)` }}>
                    {String(i + 1).padStart(2, "00")}
                  </div>
                  <EditableText id={s.id} defaultValue={s.body} as="p" multiline
                    className="relative text-base leading-relaxed text-white/95 sm:text-lg" />
                </div>
              </SafeReveal>
            ))}
          </div>
        </div>
      </section>
    );
  }
  