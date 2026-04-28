"use client";
import MeshGradient from "./MeshGradient";

/**
 * Atmospheric backdrop — pulsating gradient orbs + animated mesh-gradient
 * canvas + grain overlay + fine grid. Persists behind every section so
 * the page feels alive at every scroll depth (not just the first one).
 */
export default function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <MeshGradient intensity={0.95} />
      {/* Pulsating gradient orbs — persist on every section */}
      <div className="orb orb-1 absolute left-[8%] top-[6%]   h-[55vh] w-[55vh] rounded-full" />
      <div className="orb orb-2 absolute right-[6%] top-[18%] h-[50vh] w-[50vh] rounded-full" />
      <div className="orb orb-3 absolute left-[40%] bottom-[5%] h-[45vh] w-[45vh] rounded-full" />
      <div className="orb orb-4 absolute right-[30%] bottom-[18%] h-[35vh] w-[35vh] rounded-full" />
      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)",
        }}
      />
      {/* Noise grain */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />
    </div>
  );
}
