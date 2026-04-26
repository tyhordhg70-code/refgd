"use client";

/**
 * Atmospheric backdrop — soft animated glow blobs and a fine grain. No
 * canvas particle field anymore (the new Hero3D component handles depth).
 */
export default function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 animate-pulseGlow"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, rgba(245,185,69,0.18), transparent 65%), radial-gradient(50% 40% at 20% 70%, rgba(199,121,208,0.18), transparent 60%), radial-gradient(50% 40% at 80% 70%, rgba(75,192,200,0.14), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)",
        }}
      />
      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />
    </div>
  );
}
