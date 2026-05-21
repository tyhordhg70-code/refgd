"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import FloatingArt from "@/components/FloatingArt";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";

  /**
   * EvadeIntroEditorial — replaces the chapter-01 "header + 2 GlassCards
   * + center vault" grid with an asymmetric editorial layout:
   *
   *   Desktop (lg+):
   *     [   01   ] [  vault art  ] [  excerpt cards  ]
   *      ─────────  ─────────────  ──────────────────
   *      ~3.3fr        260px            ~3fr
   *
   *   Mobile/tablet: oversized numeral on top, then vault, then two
   *   excerpt cards stacked. Same content, same edit ids — the chapter
   *   pill, title, and both body paragraphs remain in place.
   *
   * All admin EditableText ids preserved: evade.ch1.eyebrow,
   * evade.ch1.title, evade.intro.body1, evade.intro.body2, evade.art.vault.
   */
  export default function EvadeIntroEditorial() {
    const reduced = useReducedMotion();
    return (
      <section className="relative z-10 py-20">
        <div className="container-wide relative">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,3.3fr)_260px_minmax(0,3fr)] lg:gap-14">
            {/* LEFT — oversized chapter numeral with pill + KineticText title */}
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none select-none editorial-display"
                style={{
                  fontSize: "clamp(8rem, 18vw, 16rem)",
                  lineHeight: 0.85,
                  background:
                    "linear-gradient(180deg, rgba(34,211,238,0.55) 0%, rgba(34,211,238,0.06) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  letterSpacing: "-0.06em",
                  fontWeight: 900,
                  textShadow: "0 12px 60px rgba(34,211,238,0.18)",
                }}
              >
                01
              </div>
              <div className="mt-4">
                <ChapterPill
                  editId="evade.ch1.eyebrow"
                  defaultValue="chapter 01 / evade"
                  accent="cyan"
                  size="md"
                />
              </div>
              <KineticText
                as="h2"
                text="Evade like a PRO."
                editId="evade.ch1.title"
                className="editorial-display relative mt-5 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5.5vw,4.2rem)]"
                style={{
                  textShadow:
                    "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                  letterSpacing: "-0.025em",
                }}
              />
            </div>

            {/* MIDDLE — floating vault art (existing FloatingArt + editId) */}
            <div className="flex justify-center">
              <FloatingArt
                editId="evade.art.vault"
                src="/uploads/evade-vault.webp"
                alt="Stealth-vault — the gateway to your anonymous setup."
                size={260}
                bobAmplitude={10}
              />
            </div>

            {/* RIGHT — two excerpt panels, magazine-style. No GlassCard.
                Just thin top divider rules + body copy with a left
                accent bar so they read as quotes/excerpts, not boxes. */}
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
              ].map((blk, i) => (
                <motion.div
                  key={blk.id}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="relative pl-6"
                >
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
                    style={{ color: blk.accent }}
                  >
                    {blk.label}
                  </div>
                  <EditableText
                    id={blk.id}
                    defaultValue={blk.body}
                    as="p"
                    multiline
                    className="relative text-lg leading-relaxed text-white/95 sm:text-xl"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
  