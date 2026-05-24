"use client";
    import EditableText from "@/components/EditableText";
    import EditableImage from "@/components/EditableImage";
    import ChapterPill from "@/components/ChapterPill";
    import KineticText from "@/components/KineticText";

    /**
     * EvadeIntroEditorial v4 — vault image now sits in a dedicated
     * full-width frame BELOW the grid (after the fraud-score body),
     * so it fills the gap between the chapter and the next section.
     * Body blocks no longer use framer-motion (whileInView caused
     * the same vanish-on-rescroll glitch that hit pricing).
     */
    export default function EvadeIntroEditorial() {
      return (
        <section className="relative z-10 pt-16 pb-4 sm:pt-24 sm:pb-6">
          <div className="container-wide relative">
            <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] lg:gap-16">
              {/* LEFT — chapter pill + title */}
              <div className="relative">
                <ChapterPill
                  editId="evade.ch1.eyebrow"
                  defaultValue="chapter 01 / evade"
                  accent="cyan"
                  size="md"
                />
                <KineticText
                  as="h2"
                  text="Evade like a PRO."
                  editId="evade.ch1.title"
                  className="editorial-display relative mt-8 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5.5vw,4.2rem)]"
                  style={{
                    textShadow:
                      "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                    letterSpacing: "-0.025em",
                    lineHeight: 1.15,
                  }}
                />
              </div>

              {/* RIGHT — editorial excerpt blocks. Static plain divs
                 (no whileInView) so they can't vanish on rescroll. */}
              <div className="relative flex flex-col gap-8">
                {[
                  {
                    id: "evade.intro.body1",
                    accent: "rgba(34,211,238,0.95)",
                    label: "01 · DEEP DIVE",
                    body:
                      "Dive into a comprehensive overview of each store's anti-fraud system and their ability to detect suspicious user behaviour. Stores invest hundreds of thousands each year to fight against refunders and are equipped with advanced machine learning algorithms to identify potential fraud — even if you are not banned.",
                  },
                  {
                    id: "evade.intro.body2",
                    accent: "rgba(167,139,250,0.95)",
                    label: "02 · FRAUD SCORE",
                    body:
                      "During the checkout process, you are assigned a fraud score, and if it reaches a certain threshold, your current and future orders may be cancelled.",
                  },
                ].map((blk) => (
                  <div key={blk.id} className="relative pl-7">
                    <span
                      aria-hidden
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                      style={{
                        background: `linear-gradient(180deg, ${blk.accent}, transparent)`,
                        boxShadow: `0 0 18px ${blk.accent}`,
                      }}
                    />
                    <div
                      className="mb-3 text-xs font-bold uppercase tracking-[0.32em]"
                      style={{ color: blk.accent, lineHeight: 1.4 }}
                    >
                      {blk.label}
                    </div>
                    <EditableText
                      id={blk.id}
                      defaultValue={blk.body}
                      as="p"
                      multiline
                      className="relative text-base leading-[1.75] text-white/95 sm:text-lg"
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* VAULT IMAGE — full-width editorial frame placed AFTER
               the fraud-score body. Professional multi-layer frame:
               metallic gradient outer ring, glass inner panel, corner
               label, signature hair-rule below. Static (no animation)
               so it can never vanish on rescroll. */}
            <div className="relative mt-20 sm:mt-24">
              {/* Outer ambient glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-10 rounded-[3rem] opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(34,211,238,0.18), transparent 70%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(245,185,69,0.12), transparent 70%)",
                  filter: "blur(40px)",
                }}
              />
              {/* Metallic gradient border (achieved via padding + background) */}
              <div
                className="relative rounded-[2.25rem] p-[1.5px]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(245,185,69,0.55) 0%, rgba(34,211,238,0.45) 35%, rgba(167,139,250,0.35) 70%, rgba(245,185,69,0.55) 100%)",
                }}
              >
                {/* Inner glass panel */}
                <div
                  className="relative overflow-hidden rounded-[calc(2.25rem-1.5px)] backdrop-blur-2xl"
                  style={{
                    background:
                      "linear-gradient(165deg, rgba(16,12,32,0.88) 0%, rgba(8,6,18,0.96) 60%, rgba(12,8,28,0.92) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.08), 0 60px 140px -30px rgba(0,0,0,0.95)",
                  }}
                >
                  {/* Top inner highlight */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  />

                  {/* Corner label — top left */}
                  <div className="absolute left-6 top-6 z-10 flex items-center gap-2 sm:left-8 sm:top-8">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: "rgba(245,185,69,0.95)",
                        boxShadow: "0 0 12px rgba(245,185,69,0.85)",
                      }}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-200/80">
                      Vault · 01
                    </span>
                  </div>

                  {/* Corner spec — top right */}
                  <div className="absolute right-6 top-6 z-10 hidden items-center gap-2 sm:right-8 sm:top-8 sm:flex">
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-cyan-200/70">
                      Anti-Fraud · Secured
                    </span>
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: "rgba(34,211,238,0.95)",
                        boxShadow: "0 0 12px rgba(34,211,238,0.85)",
                      }}
                    />
                  </div>

                  {/* Image */}
                  <div className="relative flex items-center justify-center px-6 pb-10 pt-20 sm:px-12 sm:pb-14 sm:pt-24">
                    <EditableImage
                      id="evade.intro.vault"
                      defaultSrc="/uploads/evade-vault.webp"
                      alt="Evade — vault art for chapter 01"
                      wrapperClassName="relative block w-full max-w-[680px]"
                      className="block h-auto w-full object-contain drop-shadow-[0_30px_60px_rgba(34,211,238,0.35)]"
                    />
                  </div>

                  {/* Bottom signature hair-rule */}
                  <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
                    <div
                      aria-hidden
                      className="h-px w-full"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(245,185,69,0.45) 30%, rgba(34,211,238,0.45) 70%, transparent 100%)",
                      }}
                    />
                    <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40">
                      <span>RefundGod</span>
                      <span>Chapter 01 · Evade</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }
  