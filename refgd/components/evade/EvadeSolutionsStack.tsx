"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import { useEffect, useState } from "react";
  import EditableText from "@/components/EditableText";
  import FloatingArt from "@/components/FloatingArt";
  import ChapterHeader from "@/components/ChapterHeader";
  import ParallaxIllustration from "@/components/ParallaxIllustration";

  const SOLUTIONS = [
    { id: "evade.solution.0", body: "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.", tint: "amber",  rgb: "245,185,69",  illo: "spark"      as const, fromX: -50, fromY: 30  },
    { id: "evade.solution.1", body: "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.", tint: "cyan", rgb: "34,211,238", illo: "encryption" as const, fromX: 0,   fromY: 60  },
    { id: "evade.solution.2", body: "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to $10,000.", tint: "violet", rgb: "167,139,250", illo: "globe"   as const, fromX: 50,  fromY: 30  },
  ];

  /**
   * EvadeSolutionsStack v2 — user feedback fixes:
   *  • The diagonal rotate + translateY transforms were clipping card
   *    03 ("Remain completely anonymous…") on mobile. Mobile now
   *    renders a clean vertical stack with NO rotate / NO offset —
   *    the asymmetric stack stays a desktop-only flourish.
   *  • Each card gets its OWN entrance direction (left / up / right)
   *    so they no longer animate identically.
   *  • Lowered viewport.amount to 0.15 so the text inside each card
   *    actually animates in even on tall mobile viewports (was
   *    invisible at amount 0.25).
   *  • Lowered backdrop-filter blur (was 12px → now 8px) to reduce
   *    paint flicker on mobile.
   */
  export default function EvadeSolutionsStack() {
    const reduced = useReducedMotion();
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
      const mq = window.matchMedia("(min-width: 1024px)");
      const sync = () => setIsDesktop(mq.matches);
      sync();
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }, []);

    return (
      <section className="relative z-10 overflow-x-clip py-20">
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
              size={300}
              bobAmplitude={10}
            />
          </div>

          <div className="relative mt-8 grid gap-6 lg:grid-cols-3 lg:gap-7">
            {SOLUTIONS.map((s, i) => (
              <motion.div
                key={s.id}
                initial={reduced ? { opacity: 1 } : { opacity: 0, x: isDesktop ? s.fromX : 0, y: isDesktop ? 0 : s.fromY }}
                whileInView={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.85, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[1.75rem]"
                  style={{
                    background: `linear-gradient(160deg, rgba(${s.rgb},0.18), rgba(10,8,22,0.85))`,
                    border: `1px solid rgba(${s.rgb},0.35)`,
                    boxShadow: `0 40px 90px -20px rgba(0,0,0,0.85), 0 0 70px -20px rgba(${s.rgb},0.45), inset 0 1px 0 rgba(255,255,255,0.08)`,
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                />
                <div className="relative p-7 sm:p-8">
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className="editorial-display text-[clamp(2rem,4vw,3.2rem)] font-black leading-none"
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
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 opacity-25 mix-blend-screen" aria-hidden="true">
                    <ParallaxIllustration kind={s.illo} accent={s.tint as any} size={110} />
                  </div>
                  <EditableText
                    id={s.id}
                    defaultValue={s.body}
                    as="p"
                    multiline
                    className="relative mt-5 text-base leading-relaxed text-white/95 sm:text-lg"
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
  