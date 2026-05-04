"use client";

  import { useEffect, useRef, useState, type ReactNode } from "react";
  import { motion, useReducedMotion, useInView } from "framer-motion";

  /**
   * PathCardCameraFly — lightweight entrance for desktop path cards.
   *
   * Previous version animated 7 CSS properties simultaneously (x, y, z,
   * rotateX, rotateY, scale, opacity) inside preserve-3d contexts — all
   * 5 cards firing at once on scroll caused significant GPU pressure and
   * scroll jank. Replaced with a simple 3-property fade+rise (opacity,
   * translateY, scale) which is compositor-only and costs a fraction of
   * the previous implementation.
   */

  // Stagger delays: outer cards land first, centre card last — gives a
  // pleasing "wings close in" feeling without any complex choreography.
  const DELAYS = [0, 0.06, 0.12, 0.06, 0];

  type Props = {
    index: number;
    children: ReactNode;
  };

  export default function PathCardCameraFly({ index, children }: Props) {
    const reduce = useReducedMotion();
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const inView = useInView(wrapRef, {
      once: true,
      margin: "0px 0px -10% 0px",
    });
    const [shouldAnimate, setShouldAnimate] = useState(false);

    useEffect(() => {
      if (inView) setShouldAnimate(true);
    }, [inView]);

    if (reduce) {
      return <div ref={wrapRef} className="h-full">{children}</div>;
    }

    return (
      <div ref={wrapRef} className="h-full">
        <motion.div
          className="h-full"
          initial={{ opacity: 0, y: 36, scale: 0.94 }}
          animate={shouldAnimate ? { opacity: 1, y: 0, scale: 1 } : undefined}
          transition={{
            duration: 0.52,
            delay: DELAYS[index % DELAYS.length],
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ willChange: "transform, opacity" }}
        >
          {children}
        </motion.div>
      </div>
    );
  }
  