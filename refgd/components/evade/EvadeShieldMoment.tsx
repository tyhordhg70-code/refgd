"use client";
import EditableImage from "@/components/EditableImage";

/**
 * EvadeShieldMoment v3 — STATIC centered shield.
 *
 * v2 used framer `useScroll` + `useTransform` to scale the shield
 * 0.5 → 0.95 → 0.7 across a 150vh sticky stage. Under Lenis the
 * scrollYProgress measurement is unreliable, the shield could
 * settle at 0.5 (looking cut-off / small) or get stuck mid-scrub.
 * The 150vh stage also added a tall empty region that pushed
 * subsequent sections far off-screen.
 *
 * v3 renders a clean centered hero shield — no sticky, no scrub,
 * no framer dependency. Existing edit id (evade.divider.secShield)
 * preserved so the image can still be swapped from the admin UI.
 */
export default function EvadeShieldMoment() {
  return (
    <section className="relative z-10 py-16 sm:py-20">
      <div className="container-wide flex justify-center">
        <div className="relative w-full max-w-3xl">
          <EditableImage
            id="evade.divider.secShield"
            defaultSrc="/uploads/sec-shield.webp"
            alt="Anti-fraud security infrastructure — servers, shields, encrypted keys."
            wrapperClassName="relative block mx-auto w-full px-4 sm:px-0"
            className="mx-auto h-auto w-full max-w-[440px] sm:max-w-[640px] object-contain drop-shadow-[0_30px_60px_rgba(34,211,238,0.35)]"
          />
        </div>
      </div>
    </section>
  );
}
