"use client";
/**
 * TelegramCard3D — cinematic 3D fly-in for the entire Telegram CTA card.
 *
 * The card starts deep in 3D space (tilted, far, below the viewport) and flies
 * to its natural flat position when it enters view. Perspective is on the PARENT
 * div (not the animated element) so the 3D distortion is correct.
 *   • rotateX  30 → 0 deg   • rotateY -16 → 0 deg
 *   • y        90 → 0 px    • scale  0.86 → 1     • opacity 0 → 1
 *   duration 1.4 s, ease [0.16, 1, 0.3, 1]
 *
 * MOBILE (<=768px) is handled ENTIRELY in CSS — never with a React flag here.
 * globals.css nullifies the perspective (.tg-card-3d-wrap { perspective:none })
 * and every transform write (.tg-card-3d { transform:none !important }) inside a
 * max-width:768px media query. framer writes transforms via inline element.style
 * (which carries no !important), so the !important media rules beat them on EVERY
 * frame, from the very FIRST paint (before hydration). That kills two iOS-Safari
 * bugs at once: (1) the stale 3D transform that left the card frozen tilted/shrunk
 * ("stuck mid animation"), and (2) the transform/perspective ancestor above the
 * card's rounded overflow:hidden clip that made iOS drop the card's composited
 * children (the bottom half + the CTA button vanish). Opacity is left untouched,
 * so mobile still gets a clean opacity fade-in.
 *
 * We deliberately do NOT branch on a React `isMobile` flag: it starts false, so
 * framer would paint the desktop 3D transform first and then never clear it —
 * which is exactly the freeze we kept looping on. CSS is correct from frame 0.
 *
 * Triggers once on intersection (>= 15 % in view). Reduced-motion: instant.
 */
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

export default function TelegramCard3D({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const reduced = useReducedMotion();

  return (
    /* Perspective wrapper. Desktop uses the inline perspective; on mobile the
       .tg-card-3d-wrap rule sets perspective:none !important (see globals.css). */
    <div
      ref={ref}
      className="tg-card-3d-wrap"
      style={{ perspective: "1100px", perspectiveOrigin: "50% 60%" }}
    >
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={{
          hidden: {
            opacity: 0,
            rotateX: 30,
            rotateY: -16,
            y: 90,
            scale: 0.86,
          },
          visible: {
            opacity: 1,
            rotateX: 0,
            rotateY: 0,
            y: 0,
            scale: 1,
          },
        }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                duration: 1.4,
                ease: [0.16, 1, 0.3, 1],
                opacity:  { duration: 0.55, ease: "easeOut" },
                rotateX:  { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
                rotateY:  { duration: 1.35, ease: [0.16, 1, 0.3, 1], delay: 0.04 },
                y:        { duration: 1.25, ease: [0.16, 1, 0.3, 1] },
                scale:    { duration: 1.4,  ease: [0.16, 1, 0.3, 1] },
              }
        }
        className="tg-card-3d"
      >
        {children}
      </motion.div>
    </div>
  );
}
