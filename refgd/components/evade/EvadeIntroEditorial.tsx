"use client";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import ChapterPill from "@/components/ChapterPill";
import KineticText from "@/components/KineticText";
import SafeReveal from "@/components/SafeReveal";

const BODIES = [
  { id: "evade.intro.body1", accent: "rgba(34,211,238,0.95)",  label: "01 · DEEP DIVE",   body: "Dive into a comprehensive overview of each store's anti-fraud system and their ability to detect suspicious user behaviour. Stores invest hundreds of thousands each year to fight against refunders and are equipped with advanced machine learning algorithms to identify potential fraud — even if you are not banned." },
  { id: "evade.intro.body2", accent: "rgba(167,139,250,0.95)", label: "02 · FRAUD SCORE", body: "During the checkout process, you are assigned a fraud score, and if it reaches a certain threshold, your current and future orders may be cancelled." },
];

/**
 * EvadeIntroEditorial — chapter 1. Unified cyan-bordered editorial frame
 * matching EvadeShieldMoment: eyebrow + KineticText heading + body blocks
 * on the left, vault image on the right. Vault no longer has its own
 * competing gradient-border card.
 */
export default function EvadeIntroEditorial() {
  return (
    <section className="relative z-10 pt-16 pb-12 sm:pt-24 sm:pb-16">
      <div className="container-wide">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-cyan-300/25 px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20"
          style={{
            background:
              "linear-gradient(160deg, rgba(34,211,238,0.14), rgba(167,139,250,0.10) 50%, rgba(10,8,22,0.94))",
            boxShadow:
              "0 60px 140px -30px rgba(0,0,0,0.85), 0 0 90px -25px rgba(34,211,238,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.30), transparent 70%)", filter: "blur(20px)" }} />
          <span aria-hidden className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.26), transparent 70%)", filter: "blur(20px)" }} />

          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
            <div>
              <ChapterPill editId="evade.ch1.eyebrow" defaultValue="chapter 01 / evade" accent="cyan" size="md" />
              <KineticText
                as="h2"
                text="Evade like a PRO."
                editId="evade.ch1.title"
                className="editorial-display mt-8 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.8rem)]"
                style={{
                  textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                }}
              />
              <div className="mt-8 flex flex-col gap-7">
                {BODIES.map((blk) => (
                  <div key={blk.id} className="relative pl-6">
                    <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
                      style={{ background: `linear-gradient(180deg, ${blk.accent}, transparent)`, boxShadow: `0 0 18px ${blk.accent}` }} />
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.32em]" style={{ color: blk.accent }}>
                      {blk.label}
                    </div>
                    <EditableText id={blk.id} defaultValue={blk.body} as="p" multiline
                      className="text-base leading-[1.75] text-white/95" />
                  </div>
                ))}
              </div>
            </div>

            <SafeReveal kind="flip3d" delay={0.15} duration={1.15} className="relative">
              <div className="relative">
                <span aria-hidden className="pointer-events-none absolute inset-x-8 -bottom-4 h-14 rounded-[100%]"
                  style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(34,211,238,0.50), transparent 70%)", filter: "blur(24px)" }} />
                <EditableImage
                  id="evade.intro.vault"
                  defaultSrc="/uploads/evade-vault.webp"
                  alt="Evade — vault art"
                  wrapperClassName="relative block mx-auto w-full"
                  className="mx-auto block h-auto w-full max-w-[420px] lg:max-w-none object-contain drop-shadow-[0_30px_60px_rgba(34,211,238,0.45)]"
                />
              </div>
            </SafeReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
