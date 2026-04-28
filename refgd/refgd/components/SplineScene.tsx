"use client";

import { Suspense, lazy, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const Spline = lazy(() => import("@splinetool/react-spline"));

type Props = {
  scene?: string;
  className?: string;
  /** Tailwind height class. */
  height?: string;
  /** Final post-blend opacity of the scene (0..1). */
  opacity?: number;
  /** Scroll-linked drift in pixels. */
  drift?: number;
};

/**
 * Ambient, transparent Spline panel — the "live factory" feel.
 *
 * The Spline scene exports with a baked light background. We don't
 * fight that; we just paint a dark blanket on top with
 * mix-blend-mode `multiply` so the bright background is multiplied
 * away and only the saturated colour-rich machinery survives,
 * gaining true transparency over the page's cosmic backdrop.
 *
 * The whole panel is oversized (140%) and translated so the camera
 * feels zoomed out, with a slow scroll-linked rise + breathing
 * rotate so it never sits still.
 */
export default function SplineScene({
  scene = "https://prod.spline.design/t1cRPSuUYdk8wCF9/scene.splinecode",
  className = "",
  height = "h-[680px]",
  opacity = 0.7,
  drift = 80,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 1.05]);

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden ${height} ${className}`}
      aria-hidden="true"
    >
      <motion.div
        style={{
          y,
          scale,
          opacity,
          mixBlendMode: "screen",
          width: "140%",
          height: "140%",
          marginLeft: "-20%",
          marginTop: "-12%",
          filter: "saturate(1.25) contrast(1.05)",
        }}
        className="absolute inset-0"
      >
        {/* Dark "subtractor" sits behind the canvas at multiply
            blend — together with screen on the wrapper, the bright
            white background of the Spline export is neutralised
            against the page's deep navy. */}
        <div
          className="absolute inset-0"
          style={{
            background: "#05060a",
            mixBlendMode: "multiply",
          }}
        />
        <motion.div
          style={{ width: "100%", height: "100%" }}
          animate={{ rotate: [0, 1.5, 0, -1.5, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          suppressHydrationWarning
        >
          <Suspense fallback={null}>
            <Spline scene={scene} />
          </Suspense>
        </motion.div>
      </motion.div>
      {/* soft edge feathering, no hard panel boundary */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(5,6,10,0.55) 100%)",
        }}
      />
    </div>
  );
}
