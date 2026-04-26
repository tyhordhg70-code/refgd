"use client";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Mouse-tracked 3D tilt wrapper. Inspired by deso.com card interactions:
 * children tilt toward the cursor with a subtle z-lift on hover. Uses
 * `transform-style: preserve-3d` so nested elements can declare their own
 * Z translations to create real depth.
 */
export default function Tilt3D({
  children,
  className = "",
  intensity = 1,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [10 * intensity, -10 * intensity]), { stiffness: 200, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-12 * intensity, 12 * intensity]), { stiffness: 200, damping: 22 });
  const lift = useMotionValue(0);
  const z = useSpring(lift, { stiffness: 250, damping: 26 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onEnter() { if (!reduced) lift.set(28); }
  function onLeave() { if (!reduced) { lift.set(0); mx.set(0); my.set(0); } }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        perspective: "1200px",
        transformStyle: "preserve-3d",
      }}
      className={className}
    >
      <motion.div
        style={{
          rotateX: reduced ? 0 : rotX,
          rotateY: reduced ? 0 : rotY,
          z: reduced ? 0 : z,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
