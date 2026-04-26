"use client";
import { useEffect, useRef } from "react";

/**
 * Cursor-reactive floating particles. Pure canvas — runs at native DPR,
 * uses requestAnimationFrame, throttles when off-screen via
 * IntersectionObserver. Particles drift slowly and gently flee the
 * cursor (radius ~ 140px). Background is transparent, sits absolute
 * inside its parent which must be `position:relative` and clip overflow.
 */
export default function InteractiveParticles({
  count = 80,
  palette = ["#ffe28a", "#a78bfa", "#67e8f9", "#f472b6", "#ffffff"],
  influence = 140,
  className = "",
}: {
  count?: number;
  palette?: string[];
  influence?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const c = cnv.getContext("2d");
    if (!c) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let running = true;
    let raf = 0;
    const mouse = { x: -9999, y: -9999, active: false };

    type P = {
      x: number; y: number; vx: number; vy: number;
      size: number; baseColor: string; pulse: number;
    };
    const parts: P[] = [];

    const resize = () => {
      const r = cnv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cnv.width = Math.max(1, Math.floor(w * dpr));
      cnv.height = Math.max(1, Math.floor(h * dpr));
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      parts.length = 0;
      for (let i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          size: 0.6 + Math.random() * 2.2,
          baseColor: palette[Math.floor(Math.random() * palette.length)],
          pulse: Math.random() * Math.PI * 2,
        });
      }
    };

    const draw = () => {
      if (!running) return;
      c.clearRect(0, 0, w, h);
      for (const p of parts) {
        // gentle drift
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;
        // wrap
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        // mouse repel
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < influence && d > 0.001) {
            const force = (1 - d / influence) * 1.6;
            p.x += (dx / d) * force;
            p.y += (dy / d) * force;
          }
        }
        // damp velocity slightly
        p.vx *= 0.995;
        p.vy *= 0.995;
        const a = 0.55 + 0.35 * Math.sin(p.pulse);
        c.fillStyle = withAlpha(p.baseColor, a);
        c.shadowBlur = 14 + p.size * 4;
        c.shadowColor = p.baseColor;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      }
      c.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const r = cnv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const ro = new ResizeObserver(() => { resize(); init(); });
    ro.observe(cnv);

    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (visible && !running) { running = true; raf = requestAnimationFrame(draw); }
      if (!visible && running) { running = false; cancelAnimationFrame(raf); }
    });
    io.observe(cnv);

    resize();
    init();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [count, influence, palette]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}

function withAlpha(hex: string, a: number) {
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) return hex;
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
