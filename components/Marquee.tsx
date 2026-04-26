"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Edge-to-edge marquee — DeSo-style wide cinematic ribbon. Pauses on
 * hover. Items repeat seamlessly via CSS animation on a duplicated track.
 */
export default function Marquee({
  children,
  speed = 60,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  speed?: number; // px per second
  reverse?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.scrollWidth / 2; // duplicated content
    const duration = w / speed;
    el.style.setProperty("--marquee-duration", `${duration}s`);
  }, [speed, children]);

  return (
    <div className={`group relative w-full overflow-hidden ${className}`}>
      <div
        ref={trackRef}
        className={`flex w-max items-center gap-12 whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused] ${
          reverse ? "marquee-reverse" : "marquee"
        }`}
      >
        <div className="flex shrink-0 items-center gap-12">{children}</div>
        <div aria-hidden="true" className="flex shrink-0 items-center gap-12">
          {children}
        </div>
      </div>
    </div>
  );
}
