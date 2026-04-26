"use client";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `value` once the element scrolls into view. Used in the
 * editorial "trust" strip on the homepage.
 */
export default function StatCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 2,
  decimals = 0,
  className = "",
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) { setN(value); return; }
    const controls = animate(0, value, {
      duration,
      ease: [0.25, 0.4, 0.25, 1],
      onUpdate: (v) => setN(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  const display = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
