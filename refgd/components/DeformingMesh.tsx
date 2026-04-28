"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * DeformingMesh — a scroll-driven dolly across an SVG mesh whose
 * geometry deforms as you travel through it. Reads as a 3D camera
 * sliding past a wireframe object that flexes / breathes.
 *
 * Implementation:
 *   - SVG <path> with cubic-bezier control points whose offsets are
 *     wired to scrollYProgress through useTransform.
 *   - The whole group is rotated and pushed in Z (scale) by scroll,
 *     which yields the "dolly past it" feel.
 *   - Layered glow + chromatic aberration for cinematic finish.
 */
export default function DeformingMesh({
  className = "",
  height = "h-[480px] sm:h-[600px]",
  accent = "#7c3aed",
}: {
  className?: string;
  height?: string;
  accent?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rot = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-12, 12]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [0.85, 1.18, 0.95]);
  const xPan = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-40, 40]);

  // Per-vertex wobble — driven through framer-motion to MotionValue
  // strings so the SVG <path> updates each scroll tick without
  // re-rendering the whole tree.
  const wobble = (base: number, amp = 60) =>
    useTransform(scrollYProgress, (v) => base + Math.sin(v * Math.PI * 2 + base * 0.01) * amp);

  const c1x = wobble(220, 80);
  const c1y = wobble(180, 60);
  const c2x = wobble(580, 80);
  const c2y = wobble(180, 60);
  const c3x = wobble(580, 80);
  const c3y = wobble(620, 60);
  const c4x = wobble(220, 80);
  const c4y = wobble(620, 60);

  // Build path D from MotionValues
  const d = useTransform(
    [c1x, c1y, c2x, c2y, c3x, c3y, c4x, c4y],
    (vals) => {
      const [x1, y1, x2, y2, x3, y3, x4, y4] = vals as number[];
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)}
              C ${x1 + 80} ${y1 - 40}, ${x2 - 80} ${y2 - 40}, ${x2.toFixed(1)} ${y2.toFixed(1)}
              C ${x2 + 40} ${y2 + 80}, ${x3 + 40} ${y3 - 80}, ${x3.toFixed(1)} ${y3.toFixed(1)}
              C ${x3 - 80} ${y3 + 40}, ${x4 + 80} ${y4 + 40}, ${x4.toFixed(1)} ${y4.toFixed(1)}
              C ${x4 - 40} ${y4 - 80}, ${x1 - 40} ${y1 + 80}, ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
    },
  );

  // Wireframe lines — a 12×12 grid with each row's vertical offset
  // reactive to scroll so the mesh "ripples" as you dolly past.
  const grid = Array.from({ length: 13 }, (_, i) => i);

  const meshShift = useTransform(scrollYProgress, (v) => Math.sin(v * Math.PI * 4) * 12);

  return (
    <div ref={ref} className={`relative w-full ${height} ${className}`} aria-hidden="true">
      <motion.div
        className="absolute inset-0 grid place-items-center"
        style={{ rotate: rot, scale, x: xPan }}
      >
        <svg viewBox="0 0 800 800" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="dm-glow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.5" />
              <stop offset="60%" stopColor={accent} stopOpacity="0.18" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="dm-stroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor={accent} />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
            <filter id="dm-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* Background bloom */}
          <rect x="0" y="0" width="800" height="800" fill="url(#dm-glow)" opacity="0.65" />

          {/* Wireframe grid */}
          <motion.g
            style={{ y: meshShift } as Record<string, unknown>}
            stroke="url(#dm-stroke)"
            strokeWidth="1"
            opacity="0.55"
            fill="none"
          >
            {grid.map((i) => (
              <line key={`h-${i}`} x1="80" x2="720" y1={120 + i * 47} y2={120 + i * 47} />
            ))}
            {grid.map((i) => (
              <line key={`v-${i}`} y1="120" y2="730" x1={80 + i * 53} x2={80 + i * 53} />
            ))}
          </motion.g>

          {/* Deforming mesh blob */}
          <motion.path
            d={d as unknown as string}
            fill="none"
            stroke="url(#dm-stroke)"
            strokeWidth="3"
            filter="url(#dm-soft)"
            style={{ opacity: 0.95 } as Record<string, unknown>}
          />
          <motion.path
            d={d as unknown as string}
            fill={accent}
            fillOpacity="0.08"
            stroke="url(#dm-stroke)"
            strokeWidth="1.5"
          />

          {/* Chromatic aberration ghost copies */}
          <motion.path
            d={d as unknown as string}
            fill="none"
            stroke="#67e8f9"
            strokeOpacity="0.35"
            strokeWidth="1"
            transform="translate(-4 0)"
          />
          <motion.path
            d={d as unknown as string}
            fill="none"
            stroke="#f472b6"
            strokeOpacity="0.35"
            strokeWidth="1"
            transform="translate(4 0)"
          />
        </svg>
      </motion.div>
    </div>
  );
}
