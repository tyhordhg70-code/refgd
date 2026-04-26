"use client";

import { Suspense, lazy } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

type Props = {
  scene?: string;
  className?: string;
  height?: string;
  rounded?: boolean;
  glow?: "violet" | "cyan" | "amber" | "none";
};

const GLOW_RING: Record<NonNullable<Props["glow"]>, string> = {
  violet:
    "ring-1 ring-violet-400/30 shadow-[0_30px_120px_-20px_rgba(167,139,250,0.45)]",
  cyan:
    "ring-1 ring-cyan-400/30 shadow-[0_30px_120px_-20px_rgba(34,211,238,0.45)]",
  amber:
    "ring-1 ring-amber-300/30 shadow-[0_30px_120px_-20px_rgba(251,191,36,0.45)]",
  none: "",
};

export default function SplineScene({
  scene = "https://prod.spline.design/t1cRPSuUYdk8wCF9/scene.splinecode",
  className = "",
  height = "h-[520px]",
  rounded = true,
  glow = "violet",
}: Props) {
  return (
    <div
      className={`relative w-full overflow-hidden ${height} ${
        rounded ? "rounded-3xl" : ""
      } ${GLOW_RING[glow]} ${className}`}
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          </div>
        }
      >
        <Spline scene={scene} />
      </Suspense>
      {/* hide the Spline watermark badge */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-14 w-44 bg-gradient-to-tl from-black/80 via-black/40 to-transparent" />
    </div>
  );
}
