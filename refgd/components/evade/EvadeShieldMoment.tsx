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
    const dim    = useTransform(scrollYProgress, [0, 0.5, 1], [0.0, 0.45, 0.0]);
    const labelY = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);

    if (disable) {
      return (
        <section className="relative z-10 py-12">
          <div className="container-wide flex justify-center">
            <div className="relative w-full max-w-3xl">
              <EditableImage
                id="evade.divider.secShield"
                defaultSrc="/uploads/sec-shield.webp"
                alt="Anti-fraud security infrastructure — servers, shields, encrypted keys."
                wrapperClassName="relative block mx-auto w-full"
                className="mx-auto h-auto w-full max-w-[640px] object-contain drop-shadow-[0_30px_60px_rgba(34,211,238,0.35)]"
              />
            </div>
          </div>
        </section>
      );
    }

    return (
      <section ref={ref} className="relative z-10" style={{ height: "150vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {/* Dimming overlay for the cosmic background */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.85) 90%)",
              opacity: dim,
            }}
          />
          {/* Editorial backdrop label */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center"
            style={{ y: labelY }}
          >
            <span
              className="editorial-display select-none font-black leading-none"
              style={{
                fontSize: "clamp(8rem, 22vw, 22rem)",
                color: "rgba(34,211,238,0.10)",
                textShadow: "0 0 80px rgba(34,211,238,0.35)",
                letterSpacing: "-0.06em",
              }}
            >
              EVADE
            </span>
          </motion.div>
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
  