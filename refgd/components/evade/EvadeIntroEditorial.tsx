"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";

  /**
   * EvadeIntroEditorial v3 — generous breathing room + repeat-on-scroll
   * animations. All headings have explicit lineHeight 1.15 and the
   * chapter pill → title → body excerpts each have honest vertical
   * rhythm so the headers no longer feel cramped. The integrated vault
   * art is moved into the title column as a deliberate composition
   * element (not a floating mid-column blob).
   */
  export default function EvadeIntroEditorial() {
    const reduced = useReducedMotion();
    return (
      <section className="relative z-10 py-16 sm:py-24">
        <div className="container-wide relative">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] lg:gap-16">
            {/* LEFT — chapter pill + KineticText title */}
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

            {/* RIGHT — editorial excerpt blocks. Transform-only entrance
               (no opacity:0) so text never goes "missing" when scrolled
               out of view. With once:false the slide repeats on rescroll. */}
            <div className="relative flex flex-col gap-8">
              {[
                {
                  id: "evade.intro.body1",
                  accent: "rgba(34,211,238,0.95)",
                  label: "01 · DEEP DIVE",
                  fromX: -50,
                  body:
                    "Dive into a comprehensive overview of each store's anti-fraud system and their ability to detect suspicious user behaviour. Stores invest hundreds of thousands each year to fight against refunders and are equipped with advanced machine learning algorithms to identify potential fraud — even if you are not banned.",
                },
                {
                  id: "evade.intro.body2",
                  accent: "rgba(167,139,250,0.95)",
                  label: "02 · FRAUD SCORE",
                  fromX: 50,
                  body:
                    "During the checkout process, you are assigned a fraud score, and if it reaches a certain threshold, your current and future orders may be cancelled.",
                },
              ].map((blk, i) => (
                <motion.div
                  key={blk.id}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, x: blk.fromX, y: 30 }}
                  whileInView={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: false, amount: 0.05 }}
                  transition={{ duration: 1.0, delay: 0.05 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="relative pl-7"
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
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
  