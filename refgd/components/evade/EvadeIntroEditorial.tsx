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

            {/* Left column: chapter heading + sol-locks image directly below */}
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
              {/* Sol-locks — directly below the heading, no backdrop-filter */}
              <SafeReveal kind="flip3d" delay={0.1} duration={1.0}>
                <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[400px] lg:mx-0">
                  <span aria-hidden className="pointer-events-none absolute inset-x-6 -bottom-4 h-10 rounded-[100%]"
                    style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(34,211,238,0.35), transparent 70%)", filter: "blur(18px)" }} />
                  <EditableImage
                    id="evade.art.solLocks"
                    defaultSrc="/uploads/sol-locks.webp"
                    alt="Security solutions — checklist, shields, locks."
                    wrapperClassName="relative z-10 block w-full"
                    className="block h-auto w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)]"
                  />
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
  