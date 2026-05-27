"use client";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import ChapterPill from "@/components/ChapterPill";
import KineticText from "@/components/KineticText";
import SafeReveal from "@/components/SafeReveal";

/**
 * EvadeShieldMoment — editorial defense feature. Previously rendered
 * just the sec-shield.webp art floating mid-page with no copy, which
 * read as unprofessional. Now framed inside a proper container with
 * eyebrow, kinetic heading, body, and the shield as the visual anchor
 * on a two-column desktop layout (stacks on mobile).
 */
export default function EvadeShieldMoment() {
  return (
    <section className="relative z-10 py-20 sm:py-24">
      <div className="container-wide">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-cyan-300/25 px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20"
          style={{
            background:
              "linear-gradient(160deg, rgba(34,211,238,0.16), rgba(167,139,250,0.10) 45%, rgba(10,8,22,0.94))",
            boxShadow:
              "0 60px 140px -30px rgba(0,0,0,0.85), 0 0 90px -25px rgba(34,211,238,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.30), transparent 70%)", filter: "blur(20px)" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.26), transparent 70%)", filter: "blur(20px)" }}
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
            <div>
              <ChapterPill
                editId="evade.shield.eyebrow"
                defaultValue="defense layer / undetectable"
                accent="cyan"
                size="md"
              />
              <KineticText
                as="h2"
                text="Built to be undetectable."
                editId="evade.shield.title"
                className="editorial-display mt-8 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.6rem)]"
                style={{
                  textShadow:
                    "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                }}
              />
              <EditableText
                id="evade.shield.body"
                defaultValue="A fortified infrastructure of sandboxed identities, rotating fingerprints, and anti-detection layers — engineered so every order looks like it came from a clean, trusted shopper. The store's fraud team sees nothing out of the ordinary; you walk away with the refund."
                as="p"
                multiline
                className="mt-6 max-w-lg text-base leading-relaxed text-white/90 sm:text-lg"
              />
            </div>

            <SafeReveal kind="riseDep" delay={0.15} duration={1.15} className="relative">
              <div className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-10 -bottom-4 h-14 rounded-[100%]"
                  style={{
                    background:
                      "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(34,211,238,0.45), transparent 70%)",
                    filter: "blur(22px)",
                  }}
                />
                <EditableImage
                  id="evade.divider.secShield"
                  defaultSrc="/uploads/sec-shield.webp"
                  alt="Anti-fraud security infrastructure — servers, shields, encrypted keys."
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
