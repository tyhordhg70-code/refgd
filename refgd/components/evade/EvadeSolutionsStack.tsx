"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import FloatingArt from "@/components/FloatingArt";
  import ChapterHeader from "@/components/ChapterHeader";
  import ParallaxIllustration from "@/components/ParallaxIllustration";

  const SOLUTIONS = [
    { id: "evade.solution.0", body: "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.", tint: "amber",  rgb: "245,185,69",  illo: "spark"      as const, rot: -3.5, offset: -12 },
    { id: "evade.solution.1", body: "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.", tint: "cyan", rgb: "34,211,238", illo: "encryption" as const, rot: 0,    offset: 0   },
    { id: "evade.solution.2", body: "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to $10,000.", tint: "violet", rgb: "167,139,250", illo: "globe"   as const, rot: 3.5,  offset: 12  },
  ];

  /**
   * EvadeSolutionsStack — replaces the chapter-02 "3 identical GlassCards
   * in a row" with a diagonal z-axis stack on desktop, and a clean
   * vertical column on mobile. Each panel is a distinct editorial
   * blockquote-style card with the existing edit ids intact
   * (evade.solution.0/1/2 + evade.art.solLocks + chapter header ids).
   */
  export default function EvadeSolutionsStack() {
    const reduced = useReducedMotion();
    return (
      <section className="relative z-10 py-24">
        <div className="container-wide relative">
          <ChapterHeader
            chapterEditId="evade.ch2.eyebrow"
            chapterDefault="chapter 02 / solutions"
            titleEditId="evade.ch2.title"
            titleDefault="Our comprehensive solutions."
            accent="violet"
          />
          <div className="mt-4 flex justify-center">
            <FloatingArt
              editId="evade.art.solLocks"
              src="/uploads/sol-locks.webp"
              alt="Comprehensive security solutions — checklist, shields, locks."
              size={360}
              bobAmplitude={10}
            />
          </div>
          {/* Z-stagger diagonal stack — each panel rotated + offset,
              with overlapping margins so they read as a deliberate
              composition instead of a 3-up grid. */}
          <div className="relative mt-8 grid gap-5 lg:gap-7 lg:grid-cols-3">
            {SOLUTIONS.map((s, i) => (
              <motion.div
                key={s.id}
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 40, rotate: s.rot * 1.5 }}
                whileInView={reduced ? undefined : { opacity: 1, y: 0, rotate: s.rot }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.85, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
                style={{
                  transform: `translateY(${s.offset}px) rotate(${s.rot}deg)`,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Layered backdrop panels for depth */}
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[1.75rem]"
                  style={{
                    background: `linear-gradient(160deg, rgba(${s.rgb},0.18), rgba(10,8,22,0.85))`,
                    border: `1px solid rgba(${s.rgb},0.35)`,
                    boxShadow: `0 40px 90px -20px rgba(0,0,0,0.85), 0 0 70px -20px rgba(${s.rgb},0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                />
                {/* Accent rule + scene number */}
                <div className="relative p-8 sm:p-10">
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className="editorial-display text-[clamp(2.2rem,4vw,3.4rem)] font-black leading-none"
                      style={{
                        color: `rgba(${s.rgb},0.95)`,
                        textShadow: `0 0 30px rgba(${s.rgb},0.55)`,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden
                      className="h-px flex-1 origin-left"
                      style={{
                        background: `linear-gradient(90deg, rgba(${s.rgb},0.7), transparent)`,
                      }}
                    />
                  </div>
                  {/* Decorative illustration corner */}
                  <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 opacity-30 mix-blend-screen" aria-hidden="true">
                    <ParallaxIllustration kind={s.illo} accent={s.tint as any} size={120} />
                  </div>
                  <EditableText
                    id={s.id}
                    defaultValue={s.body}
                    as="p"
                    multiline
                    className="relative mt-6 text-base leading-relaxed text-white/95 sm:text-lg"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  