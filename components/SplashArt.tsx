"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Top-of-page splash art that, on mount, "explodes" into ~120 abstract
 * paint-particles flung across the viewport in random directions.
 *
 * After the explosion, a faint "stain" remains at the origin (we just leave
 * a rotated, low-opacity copy of the source image behind so the user sees
 * where the burst came from).
 */
export default function SplashArt({
  src = "/images/splash-1.png",
  alt = "RefundGod",
}: {
  src?: string;
  alt?: string;
}) {
  const [exploded, setExploded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Trigger explosion shortly after mount so the user sees the unexploded
    // image first.
    const t = setTimeout(() => setExploded(true), 380);
    return () => clearTimeout(t);
  }, []);

  // Particle explosion across viewport
  useEffect(() => {
    if (!exploded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = Math.max(rect.width * dpr, 1);
      canvas.height = Math.max(rect.height * dpr, 1);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();

    // origin = center top of the canvas
    const origin = { x: canvas.width / 2, y: canvas.height * 0.18 };

    type P = {
      x: number; y: number; vx: number; vy: number;
      r: number; life: number; maxLife: number;
      hue: number; sat: number; light: number;
    };
    const particles: P[] = [];
    const palette = [
      [42, 95, 65],   // gold
      [285, 80, 65], // violet
      [195, 90, 60], // cyan
      [325, 85, 65], // fuchsia
      [25, 95, 60],  // orange
    ];
    for (let i = 0; i < 220; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 18;
      const c = palette[Math.floor(Math.random() * palette.length)];
      particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: (1 + Math.random() * 4) * dpr,
        life: 0,
        maxLife: 130 + Math.random() * 90,
        hue: c[0] + (Math.random() - 0.5) * 20,
        sat: c[1],
        light: c[2],
      });
    }

    let raf = 0;
    let frame = 0;
    const tick = () => {
      frame++;
      // fade slightly each frame for trail
      ctx.fillStyle = "rgba(5,6,10,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of particles) {
        if (p.life > p.maxLife) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.vy += 0.04 * dpr; // slight gravity
        p.life++;

        const t = 1 - p.life / p.maxLife;
        ctx.globalAlpha = Math.max(0, t);
        ctx.fillStyle = `hsl(${p.hue} ${p.sat}% ${p.light}%)`;
        ctx.shadowColor = `hsl(${p.hue} ${p.sat}% ${p.light}%)`;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * t, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (alive > 0 && frame < 600) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [exploded]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] -mt-8 h-[110vh] overflow-hidden">
      {/* Wide canvas fills viewport so particles can spread across page */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Origin "stain" — faded copy of the splash that remains after the burst */}
      <div className="absolute left-1/2 top-[12%] -translate-x-1/2">
        <div
          className={`relative mx-auto h-44 w-44 transition-all duration-1000 ease-out sm:h-56 sm:w-56 md:h-64 md:w-64 ${
            exploded ? "opacity-25 blur-[1.5px] scale-90" : "opacity-100"
          }`}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 200px, 256px"
            priority
            className="select-none object-contain drop-shadow-[0_0_60px_rgba(245,185,69,0.55)]"
          />
        </div>
      </div>
    </div>
  );
}
