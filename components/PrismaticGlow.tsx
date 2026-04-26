"use client";
import type { ReactNode, CSSProperties } from "react";

/**
 * Wraps any element with an animated chromatic / prismatic glow border.
 * Uses CSS @property registered angle vars + conic-gradient (defined in
 * globals.css) with a graceful fallback for browsers that don't support
 * them.
 */
export default function PrismaticGlow({
  children,
  className = "",
  radius = "1.5rem",
  thickness = 1.5,
  intensity = 1,
  style,
}: {
  children: ReactNode;
  className?: string;
  radius?: string;
  thickness?: number;
  intensity?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`prismatic-glow ${className}`}
      style={{
        ["--pg-radius" as any]: radius,
        ["--pg-thickness" as any]: `${thickness}px`,
        ["--pg-intensity" as any]: intensity,
        borderRadius: radius,
        ...style,
      }}
    >
      <div className="prismatic-glow-inner" style={{ borderRadius: `calc(${radius} - 1px)` }}>
        {children}
      </div>
    </div>
  );
}
