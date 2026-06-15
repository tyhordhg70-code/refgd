"use client";
import EditableText from "@/components/EditableText";
import KineticText from "@/components/KineticText";
import SafeReveal from "@/components/SafeReveal";
import EvadeVaultEmblem from "@/components/EvadeVaultEmblem";
import HudEyebrow from "./HudEyebrow";
import HudFrame from "./HudFrame";

const BODIES = [
  { id: "evade.intro.body1", rgb: "34,211,238",  label: "01 · DEEP DIVE",   code: "0x01", body: "Dive into a comprehensive overview of each store's anti-fraud system and their ability to detect suspicious user behaviour. Stores invest hundreds of thousands each year to fight against refunders and are equipped with advanced machine learning algorithms to identify potential fraud — even if you are not banned." },
  { id: "evade.intro.body2", rgb: "167,139,250", label: "02 · FRAUD SCORE", code: "0x02", body: "During the checkout process, you are assigned a fraud score, and if it reaches a certain threshold, your current and future orders may be cancelled." },
];

/**
 * EvadeIntroEditorial — chapter 1, redesigned as a CLASSIFIED DOSSIER.
 *
 * Replaces the gradient glass panel + corner blobs with a HudFrame
 * dossier: an oversized backdrop "01", monospace file metadata, the
 * animated vault-lock emblem presented as evidence behind a corner-bracket
 * reticle, and the two intel paragraphs styled as numbered file entries.
 * Distinct silhouette from every other section.
 *
 * The static vault image (evade.intro.vault) was swapped for the animated
 * EvadeVaultEmblem — the layered shield-lock emblem that was originally the
 * hero centerpiece — per request. The emblem is purely decorative (not an
 * admin-editable field).
 *
 * Preserved editIds: evade.ch1.eyebrow / .title, evade.intro.body1/2. Body
 * labels are the same decorative strings as before.
 */
export default function EvadeIntroEditorial() {
  return (
    <section className="relative z-10 pt-16 pb-12 sm:pt-24 sm:pb-16">
      <div className="container-wide">
        <HudFrame
          accent="cyan"
          variant="panel"
          tag="DOSSIER // EVADE.01"
          status="● CLASSIFIED"
          className="overflow-hidden rounded-2xl px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20"
        >
          {/* oversized backdrop numeral */}
          <span
            aria-hidden
            className="editorial-display pointer-events-none absolute -bottom-10 -left-3 select-none font-black leading-none"
            style={{ fontSize: "clamp(9rem,22vw,20rem)", color: "rgba(34,211,238,0.05)", letterSpacing: "-0.06em" }}
          >
            01
          </span>

          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
            <div>
              <HudEyebrow editId="evade.ch1.eyebrow" defaultValue="chapter 01 / evade" accent="cyan" />
              <KineticText
                as="h2"
                text="Evade like a PRO."
                editId="evade.ch1.title"
                className="editorial-display mt-7 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.8rem)]"
                style={{
                  textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.12,
                }}
              />
              <div className="mt-9 flex flex-col gap-6">
                {BODIES.map((blk) => (
                  <SafeReveal key={blk.id} kind="slideRight" duration={0.9}>
                    <div
                      className="relative rounded-lg border border-white/10 bg-white/[0.02] p-5 pl-6"
                      style={{ boxShadow: `inset 2px 0 0 rgba(${blk.rgb},0.85)` }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.3em]"
                          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', color: `rgba(${blk.rgb},0.95)` }}
                        >
                          {blk.label}
                        </span>
                        <span
                          aria-hidden
                          className="text-[10px] tracking-[0.2em] text-white/30"
                          style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
                        >
                          {blk.code}
                        </span>
                      </div>
                      <EditableText id={blk.id} defaultValue={blk.body} as="p" multiline
                        className="text-base leading-[1.75] text-white/90" />
                    </div>
                  </SafeReveal>
                ))}
              </div>
            </div>

            <SafeReveal kind="flip3d" delay={0.15} duration={1.15} className="relative">
              <div className="relative mx-auto w-full max-w-[440px]">
                {/* corner brackets framing the evidence */}
                {(["tl", "tr", "bl", "br"] as const).map((p) => (
                  <span
                    key={p}
                    aria-hidden
                    className="absolute z-10 h-6 w-6 border-cyan-300/50"
                    style={{
                      top: p[0] === "t" ? -6 : undefined,
                      bottom: p[0] === "b" ? -6 : undefined,
                      left: p[1] === "l" ? -6 : undefined,
                      right: p[1] === "r" ? -6 : undefined,
                      borderTopWidth: p[0] === "t" ? 2 : 0,
                      borderBottomWidth: p[0] === "b" ? 2 : 0,
                      borderLeftWidth: p[1] === "l" ? 2 : 0,
                      borderRightWidth: p[1] === "r" ? 2 : 0,
                      borderStyle: "solid",
                    }}
                  />
                ))}
                <span aria-hidden className="pointer-events-none absolute inset-x-8 -bottom-4 h-14 rounded-[100%]"
                  style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(34,211,238,0.45), transparent 70%)", filter: "blur(24px)" }} />
                <EvadeVaultEmblem />
              </div>
            </SafeReveal>
          </div>
        </HudFrame>
      </div>
    </section>
  );
}
