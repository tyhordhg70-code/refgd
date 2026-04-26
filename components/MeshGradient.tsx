"use client";
import { useEffect, useRef } from "react";

/**
 * Slow-drifting mesh gradient on a canvas. Three colored radial blobs
 * gently orbit each other to create the noomoagency / arc.net atmospheric
 * backdrop. Sits behind everything; pointer-events none.
 */
export default function MeshGradient({
  className = "",
  intensity = 1,
}: { className?: string; intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);

    const blobs = [
      { x: 0.2, y: 0.3, r: 0.55, color: "rgba(245,185,69,0.35)" },   // gold
      { x: 0.78, y: 0.4, r: 0.5,  color: "rgba(167,139,250,0.32)" }, // violet
      { x: 0.55, y: 0.85, r: 0.55, color: "rgba(34,211,238,0.28)" },  // cyan
      { x: 0.05, y: 0.85, r: 0.4, color: "rgba(244,114,182,0.22)" }, // pink
    ];

    function resize() {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const parentW = rect?.width ?? window.innerWidth;
      const parentH = rect?.height ?? window.innerHeight;
      w = parentW;
      h = parentH;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(t: number) {
      ctx.clearRect(0, 0, w, h);
      // base dark wash
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#06070d");
      bg.addColorStop(1, "#0a0c14");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      blobs.forEach((b, i) => {
        const phase = t * 0.00012 * (1 + i * 0.18);
        const dx = Math.sin(phase + i * 1.7) * 0.12;
        const dy = Math.cos(phase * 1.3 + i * 0.9) * 0.12;
        const cx = (b.x + dx) * w;
        const cy = (b.y + dy) * h;
        const radius = b.r * Math.max(w, h) * intensity;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grd.addColorStop(0, b.color);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      });
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
    />
  );
}
