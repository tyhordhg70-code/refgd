"use client";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mouse-tracked 3D tilt wrapper. Children tilt toward the cursor
 * with a subtle z-lift on hover. Uses `transform-style: preserve-3d`
 * so nested elements can declare their own Z translations to create
 * real depth.
 *
 * On touch devices and reduced-motion users the wrapper is a no-op
 * — children render naked without the perspective + preserve-3d
 * layers, eliminating wasted GPU layer budget on mobile (the tilt
 * effect itself is mouse-only and would never be visible anyway).
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Combined check: width AND coarse-pointer. Either one being
    // true means the tilt effect is invisible to the user.
    const mq = window.matchMedia(
      "(max-width: 768px), (pointer: coarse)",
    );
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const skip = reduced || isMobile;

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [10 * intensity, -10 * intensity]), { stiffness: 200, damping: 22 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-12 * intensity, 12 * intensity]), { stiffness: 200, damping: 22 });
  const lift = useMotionValue(0);
  const z = useSpring(lift, { stiffness: 250, damping: 26 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (skip) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onEnter() { if (!skip) lift.set(28); }
  function onLeave() { if (!skip) { lift.set(0); mx.set(0); my.set(0); } }

  // Mobile / reduced: render children naked. No motion wrappers,
  // no perspective layer, no extra GPU compositing on scroll.
  if (skip) {
    return <div ref={ref} className={className}>{children}</div>;
  }

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
      suppressHydrationWarning
      className={className}
    >
      <motion.div
        style={{
          rotateX: rotX,
          rotateY: rotY,
          z,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        suppressHydrationWarning
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
