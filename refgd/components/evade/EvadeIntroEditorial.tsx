"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import FloatingArt from "@/components/FloatingArt";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";

  /**
   * EvadeIntroEditorial v2 — user feedback:
   *  • Removed the oversized "01" numeral (was duplicating the
   *    chapter pill).
   *  • Tightened the gap between the title and the body excerpts so
   *    they read as one continuous unit.
   *  • Lowered the viewport.amount on body fades from 0.4 → 0.15 so
   *    the dark body cards animate in even on tall mobile screens
   *    instead of staying invisible (the "dark boxcards text is all
   *    missing" bug).
   *  • Added varied entrance directions per body block so the
   *    section feels less uniform.
   */
  export default function EvadeIntroEditorial() {
    const reduced = useReducedMotion();
    return (
      <section className="relative z-10 py-16">
        <div className="container-wide relative">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_240px_minmax(0,1.2fr)] lg:gap-12">
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
                className="editorial-display relative mt-5 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5.5vw,4.2rem)]"
                style={{
                  textShadow:
                    "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.02,
                }}
              />
            </div>

            {/* MIDDLE — floating vault art */}
            <div className="flex justify-center lg:justify-center">
              <FloatingArt
                editId="evade.art.vault"
                src="/uploads/evade-vault.webp"
                alt="Stealth-vault — the gateway to your anonymous setup."
                size={240}
                bobAmplitude={10}
              />
            </div>

            {/* RIGHT — editorial excerpt blocks, no boxes */}
            <div className="relative flex flex-col gap-6">
              {[
                {
                  id: "evade.intro.body1",
                  accent: "rgba(34,211,238,0.95)",
                  label: "01 · DEEP DIVE",
                  fromX: -30,
                  body:
                    "Dive into a comprehensive overview of each store's anti-fraud system and their ability to detect suspicious user behaviour. Stores invest hundreds of thousands each year to fight against refunders and are equipped with advanced machine learning algorithms to identify potential fraud — even if you are not banned.",
                },
                {
                  id: "evade.intro.body2",
                  accent: "rgba(167,139,250,0.95)",
                  label: "02 · FRAUD SCORE",
                  fromX: 30,
                  body:
                    "During the checkout process, you are assigned a fraud score, and if it reaches a certain threshold, your current and future orders may be cancelled.",
                },
              ].map((blk, i) => (
                <motion.div
                  key={blk.id}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, x: blk.fromX, y: 18 }}
                  whileInView={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.75, delay: 0.05 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
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
                    className="mb-2 text-xs font-bold uppercase tracking-[0.32em]"
                    style={{ color: blk.accent }}
                  >
                    {blk.label}
                  </div>
                  <EditableText
                    id={blk.id}
                    defaultValue={blk.body}
                    as="p"
                    multiline
                    className="relative text-lg leading-relaxed text-white/95"
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
  