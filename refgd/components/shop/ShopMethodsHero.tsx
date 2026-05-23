"use client";

  import { motion, useReducedMotion } from "framer-motion";
  import EditableImage from "@/components/EditableImage";
  import EditableText from "@/components/EditableText";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";

  type Hero = {
    image: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    telegram: string;
  };

  /**
   * ShopMethodsHero — full-bleed hero, matches evade-page editorial language.
   *   • clip-path wipe reveal on the framed banner
   *   • spring scale-in on the title block
   *   • all text fields admin-editable
   */
  export default function ShopMethodsHero({ hero }: { hero: Hero }) {
    const reduced = useReducedMotion();

    return (
      <section className="relative z-10 pt-12 pb-10 sm:pt-24 sm:pb-16 overflow-x-clip">
        <div className="container-wide relative">
          {/* Framed banner */}
          <motion.div
            initial={reduced ? {} : { clipPath: "inset(100% 0 0 0 round 2rem)", opacity: 0 }}
            whileInView={reduced ? undefined : { clipPath: "inset(0% 0 0 0 round 2rem)", opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-violet-400/25"
            style={{
              boxShadow:
                "0 60px 140px -30px rgba(0,0,0,0.85), 0 0 90px -25px rgba(167,139,250,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <EditableImage
              id="shop.hero.banner"
              defaultSrc={hero.image}
              alt="Shop Methods hero banner"
              wrapperClassName="relative z-0 block w-full"
              className="block h-[260px] w-full object-cover sm:h-[380px] lg:h-[460px]"
            />
            {/* dark gradient overlay so text reads on any banner */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,8,22,0.25) 0%, rgba(10,8,22,0.55) 55%, rgba(10,8,22,0.92) 100%)",
              }}
            />
          </motion.div>

          {/* Title block — overlapping the banner */}
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 40, scale: 0.96 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 80, damping: 16, delay: 0.45 }}
            className="relative z-10 mx-auto -mt-16 max-w-4xl rounded-[1.75rem] border border-white/10 bg-[rgba(10,8,22,0.78)] p-6 text-center backdrop-blur-md sm:-mt-28 sm:p-12"
            style={{
              boxShadow:
                "0 40px 100px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <ChapterPill
              editId="shop.hero.eyebrow"
              defaultValue={hero.eyebrow}
              accent="violet"
              size="md"
            />
            <KineticText
              as="h1"
              text={hero.title}
              editId="shop.hero.title"
              className="editorial-display mt-6 text-balance uppercase text-white text-[clamp(2.4rem,6.5vw,5rem)]"
              style={{
                textShadow:
                  "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            />
            <EditableText
              id="shop.hero.subtitle"
              defaultValue={hero.subtitle}
              as="p"
              multiline
              className="mx-auto mt-6 max-w-2xl text-base leading-[1.7] text-white/85 sm:text-lg"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
            />
          </motion.div>
        </div>
      </section>
    );
  }
  