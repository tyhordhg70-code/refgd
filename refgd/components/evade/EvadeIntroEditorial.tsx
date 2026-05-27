"use client";
  import EditableText from "@/components/EditableText";
  import EditableImage from "@/components/EditableImage";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";
  import SafeReveal from "@/components/SafeReveal";

  const BODIES = [
    { id: "evade.intro.body1", accent: "rgba(34,211,238,0.95)",  label: "01 · DEEP DIVE",   body: "Dive into a comprehensive overview of each store's anti-fraud system and their ability to detect suspicious user behaviour. Stores invest hundreds of thousands each year to fight against refunders and are equipped with advanced machine learning algorithms to identify potential fraud — even if you are not banned.", kind: "flip3d" as const },
    { id: "evade.intro.body2", accent: "rgba(167,139,250,0.95)", label: "02 · FRAUD SCORE", body: "During the checkout process, you are assigned a fraud score, and if it reaches a certain threshold, your current and future orders may be cancelled.", kind: "flip3d" as const },
  ];

  export default function EvadeIntroEditorial() {
    return (
      <section className="relative z-10 pt-16 pb-8 sm:pt-24 sm:pb-12">
        <div className="container-wide relative">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] lg:gap-16">

            {/* Left column: heading + vault image directly below */}
            <div className="relative flex flex-col gap-8">
              <div>
                <ChapterPill editId="evade.ch1.eyebrow" defaultValue="chapter 01 / evade" accent="cyan" size="md" />
                <KineticText
                  as="h2"
                  text="Evade like a PRO."
                  editId="evade.ch1.title"
                  className="editorial-display relative mt-8 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5.5vw,4.2rem)]"
                  style={{ textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)", letterSpacing: "-0.025em", lineHeight: 1.15 }}
                />
              </div>

              {/* Vault — gradient-border card, NO backdrop-filter */}
              <SafeReveal kind="flip3d" delay={0.1} duration={1.1}>
                <div aria-hidden className="pointer-events-none absolute -inset-6 rounded-[2.5rem] opacity-40"
                  style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(34,211,238,0.18), transparent 70%)", filter: "blur(32px)" }} />
                <div className="relative rounded-[2rem] p-[1.5px]"
                  style={{ background: "linear-gradient(135deg, rgba(245,185,69,0.55) 0%, rgba(34,211,238,0.50) 35%, rgba(167,139,250,0.40) 70%, rgba(245,185,69,0.55) 100%)" }}>
                  <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)]"
                    style={{ background: "linear-gradient(165deg, rgba(16,12,32,0.92) 0%, rgba(8,6,18,0.98) 60%, rgba(12,8,28,0.95) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 50px 120px -25px rgba(0,0,0,0.95)" }}>
                    <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    <div className="flex items-center justify-center px-5 py-8 sm:px-10 sm:py-12">
                      <EditableImage
                        id="evade.intro.vault"
                        defaultSrc="/uploads/evade-vault.webp"
                        alt="Evade — vault art"
                        wrapperClassName="relative block w-full max-w-[480px]"
                        className="block h-auto w-full object-contain drop-shadow-[0_24px_48px_rgba(34,211,238,0.35)]"
                      />
                    </div>
                  </div>
                </div>
              </SafeReveal>
            </div>

            {/* Right column: body text blocks */}
            <div className="relative flex flex-col gap-8">
              {BODIES.map((blk, i) => (
                <SafeReveal key={blk.id} className="relative pl-7" kind={blk.kind} delay={0.15 + i * 0.14}>
                  <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                    style={{ background: `linear-gradient(180deg, ${blk.accent}, transparent)`, boxShadow: `0 0 18px ${blk.accent}` }} />
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.32em]" style={{ color: blk.accent, lineHeight: 1.4 }}>{blk.label}</div>
                  <EditableText id={blk.id} defaultValue={blk.body} as="p" multiline
                    className="relative text-base leading-[1.75] text-white/95 sm:text-lg"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }} />
                </SafeReveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
  