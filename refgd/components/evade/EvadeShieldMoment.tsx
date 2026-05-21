"use client";
  import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
  import { useEffect, useRef, useState } from "react";
  import EditableImage from "@/components/EditableImage";
  import { useEditContext } from "@/lib/edit-context";

  /**
   * EvadeShieldMoment — promotes the sec-shield divider from a small
   * floating PNG into a full-viewport scroll "moment".
   *
   * Desktop: sticky inner scales the shield 0.45 → 1.15 → 0.7 across
   * one viewport-height scroll, with the surrounding cosmic background
   * dimming via an overlay opacity scrub. Editorial label "EVADE / 01"
   * sits behind the shield as oversized type. Mobile / edit mode /
   * reduced-motion: renders as a clean centered hero shield, no pin,
   * no scrub.
   *
   * Existing edit id preserved (evade.divider.secShield) so admin can
   * still swap the image, apply animation templates, scale, and tune
   * spacing from the popover.
   */
  export default function EvadeShieldMoment() {
    const reduced = useReducedMotion();
    const { isAdmin, editMode } = useEditContext();
    const editing = isAdmin && editMode;

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
      const mq = window.matchMedia("(max-width: 1023px)");
      const sync = () => setIsMobile(mq.matches);
      sync();
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }, []);

    const disable = reduced || editing || isMobile;

    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
      target: ref,
      offset: ["start end", "end start"],
    });
    const scale  = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 1.15, 0.75]);

    if (disable) {
      return (
        <section className="relative z-10 py-12">
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

    return (
      <section ref={ref} className="relative z-10" style={{ height: "150vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {/* The shield itself */}
          <motion.div className="relative z-10" style={{ scale }}>
            <EditableImage
              id="evade.divider.secShield"
              defaultSrc="/uploads/sec-shield.webp"
              alt="Anti-fraud security infrastructure — servers, shields, encrypted keys."
              wrapperClassName="relative block"
              className="mx-auto h-auto w-full max-w-[520px] object-contain drop-shadow-[0_40px_80px_rgba(34,211,238,0.55)]"
            />
          </motion.div>
        </div>
      </section>
    );
  }
  