"use client";
import { type ReactNode, type CSSProperties, useEffect, useState } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";

export type RevealKind =
  | "lift"
  | "slideLeft"
  | "slideRight"
  | "fan"
  | "fanLeft"
  | "fanRight"
  | "scale"
  | "wipe";

/**
 * SafeReveal v5 — CSS-only entrance, no framer-motion, no IntersectionObserver.
 *
 * Why this is the bulletproof rewrite (path C):
 *   • v3 used framer-motion `whileInView` (IntersectionObserver). Under
 *     Lenis smooth-scroll the observer mis-fires because Lenis virtualizes
 *     scroll via a parent transform; cards could trigger while invisible
 *     and `once:true` then prevented replay, or never trigger on rescroll.
 *   • v5 ELIMINATES the dependency chain. The entrance is a single CSS
 *     `@keyframes` animation that runs once on mount, gated by the
 *     existing `useEntranceReady()` hook so it doesn't play behind the
 *     LoadingScreen splash. No scroll trigger = no missed fire.
 *   • SSR renders the element at its REST state (opacity:1, transform:none).
 *     If JS fails entirely, content is fully visible — no "vanish".
 *   • On client, after `useEntranceReady()` flips true, we attach
 *     a class with `animation-fill-mode: backwards` so the animation
 *     starts from its `from` keyframe for the duration of the animation
 *     only, then settles back to rest.
 *   • Three keyframes cover all 8 kinds — fans/scale/wipe collapse to
 *     the vertical lift (matching v3's "no horizontal/rotate/scale"
 *     rule that prevents card edge-clipping).
 */
export default function SafeReveal({
  children,
  className = "",
  style,
  delay = 0,
  kind = "lift",
  duration = 0.95,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  kind?: RevealKind;
  amount?: number; // accepted for backward compat, ignored
  duration?: number;
  as?: "div" | "section" | "article" | "li";
}) {
  const ready = useEntranceReady();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    // Defer one frame so the class flip triggers a fresh animation cycle.
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, [ready]);

  const kindClass =
    kind === "slideLeft"
      ? "sr5-slide-left"
      : kind === "slideRight"
      ? "sr5-slide-right"
      : "sr5-lift";

  const animClass = armed ? `sr5-anim ${kindClass}` : "";
  const animStyle: CSSProperties = armed
    ? {
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }
    : {};

  const Comp = Tag as any;
  return (
    <Comp
      className={`${className} ${animClass}`.trim()}
      style={{ ...style, ...animStyle }}
      suppressHydrationWarning
    >
      {children}
    </Comp>
  );
}
