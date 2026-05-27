"use client";
  import EditableImage from "@/components/EditableImage";
  import SafeReveal from "@/components/SafeReveal";

  export default function EvadeShieldMoment() {
    return (
      <section className="relative z-10 py-16 sm:py-20">
        <div className="container-wide flex justify-center">
          <div className="relative w-full max-w-3xl">
            <SafeReveal kind="riseDep" delay={0} duration={1.15}>
              <EditableImage
                id="evade.divider.secShield"
                defaultSrc="/uploads/sec-shield.webp"
                alt="Anti-fraud security infrastructure — servers, shields, encrypted keys."
                wrapperClassName="relative block mx-auto w-full px-4 sm:px-0"
                className="mx-auto h-auto w-full max-w-[440px] sm:max-w-[640px] object-contain drop-shadow-[0_30px_60px_rgba(34,211,238,0.35)]"
              />
            </SafeReveal>
          </div>
        </div>
      </section>
    );
  }
  