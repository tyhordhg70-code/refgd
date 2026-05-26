"use client";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import ChapterPill from "@/components/ChapterPill";
import KineticText from "@/components/KineticText";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import SafeReveal from "@/components/SafeReveal";

const SOLUTIONS = [
  { id: "evade.solution.0", body: "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.", tint: "amber",  rgb: "245,185,69",  illo: "spark"      as const, kind: "fanLeft"  as const },
  { id: "evade.solution.1", body: "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.", tint: "cyan", rgb: "34,211,238", illo: "encryption" as const, kind: "fan"      as const },
  { id: "evade.solution.2", body: "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to $10,000.", tint: "violet", rgb: "167,139,250", illo: "globe"   as const, kind: "fanRight" as const },
];

/**
 * EvadeSolutionsStack v4 — root-cause fix for vanishing/half-cut cards
 * and sol-locks image clipping on rescroll.
 *
 *  • Outer header panel is a STATIC <div>. Previously wrapped in
 *    SafeReveal which translated the entire panel (including the
 *    sol-locks image) on every viewport re-entry; on Lenis smooth
 *    scroll the panel could be caught mid-transform on rescroll,
 *    making the integrated image appear cut. Static panel = always
 *    pixel-perfect.
 *  • Cards use SafeReveal with kind="fan*" (3D entrance with x +
 *    rotate + scale, opacity always 1) and `once:true` so they
 *    animate exactly once on first scroll-into-view. Never replay,
 *    never vanish, never half-render.
 *  • Section drops `overflow-x-clip` so card rotate/translate during
 *    entry isn't clipped against the section edge.
 */
export default function EvadeSolutionsStack() {
  return (
    <section className="relative z-10 pt-8 pb-20 sm:pt-12 sm:pb-28">
      <div className="container-wide relative">
        <div className="relative rounded-[2rem] border border-violet-400/25 px-6 py-10 sm:p-12 lg:p-14"
          style={{
            background:
              "linear-gradient(160deg, rgba(167,139,250,0.13), rgba(34,211,238,0.08) 50%, rgba(10,8,22,0.92))",
            boxShadow:
              "0 60px 140px -30px rgba(0,0,0,0.85), 0 0 90px -25px rgba(167,139,250,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.30), transparent 70%)", filter: "blur(20px)" }} />
          <span aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.22), transparent 70%)", filter: "blur(20px)" }} />

          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
            <div>
              <ChapterPill
                editId="evade.ch2.eyebrow"
                defaultValue="chapter 02 / solutions"
                accent="violet"
                size="md"
              />
              <KineticText
                as="h2"
                text="Our comprehensive solutions."
                editId="evade.ch2.title"
                className="editorial-display mt-8 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.8rem)]"
                style={{
                  textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                }}
              />
            </div>
            <div className="relative mx-auto block w-full max-w-[300px] sm:max-w-[380px]">
              <span aria-hidden className="pointer-events-none absolute inset-x-6 -bottom-2 h-8 rounded-[100%]"
                style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(167,139,250,0.55), transparent 70%)", filter: "blur(14px)" }} />
              <div style={{ width: "100%" }}>
                <EditableImage
                  id="evade.art.solLocks"
                  defaultSrc="/uploads/sol-locks.webp"
                  alt="Comprehensive security solutions — checklist, shields, locks."
                  wrapperClassName="relative z-10 block w-full"
                  className="block h-auto w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-10 grid gap-6 lg:grid-cols-3 lg:gap-7" >
          {SOLUTIONS.map((s, i) => (
            <SafeReveal
              key={s.id}
              className="group relative"
              delay={0.08 + i * 0.14}
              kind={s.kind}
              duration={1.05}
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
                    className="editorial-display text-[clamp(2rem,4vw,3.2rem)] font-black"
                    style={{
                      color: `rgba(${s.rgb},0.95)`,
                      textShadow: `0 0 30px rgba(${s.rgb},0.55)`,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span aria-hidden className="h-px flex-1"
                    style={{ background: `linear-gradient(90deg, rgba(${s.rgb},0.7), transparent)` }} />
                </div>
                <div className="pointer-events-none absolute right-2 top-2 h-20 w-20 opacity-20" aria-hidden="true">
                  <ParallaxIllustration kind={s.illo} accent={s.tint as any} size={110} />
                </div>
                <EditableText
                  id={s.id}
                  defaultValue={s.body}
                  as="p"
                  multiline
                  className="relative mt-5 text-base leading-[1.7] text-white/95 sm:text-lg"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
                />
              </div>
            </SafeReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
