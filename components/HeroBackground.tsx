"use client";
import { useEffect, useRef } from "react";

/**
 * Animated hero backdrop:
 *  - pulsating radial gradient
 *  - canvas particle field
 *  - mouse-drag parallax (the field translates with the cursor)
 *
 * Uses requestAnimationFrame, capped at ~60fps. Pauses when off-screen.
 */
export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; tx: number; ty: number; down: boolean }>({
    x: 0, y: 0, tx: 0, ty: 0, down: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: { x: number; y: number; vx: number; vy: number; r: number; hue: number }[] = [];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let visible = true;

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = Math.max(rect.width * dpr, 1);
      canvas.height = Math.max(rect.height * dpr, 1);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      seed();
    }

    function seed() {
      if (!canvas) return;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const count = Math.min(140, Math.floor((w * h) / 9000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 0.6 + Math.random() * 1.8,
        hue: Math.random() < 0.6 ? 42 : Math.random() < 0.5 ? 285 : 195, // gold / violet / cyan
      }));
    }

    function tick() {
      if (!visible || !canvas || !ctx) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // Smooth mouse follow
      mouseRef.current.tx += (mouseRef.current.x - mouseRef.current.tx) * 0.06;
      mouseRef.current.ty += (mouseRef.current.y - mouseRef.current.ty) * 0.06;
      const mx = mouseRef.current.tx;
      const my = mouseRef.current.ty;

      // Connecting lines first
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 110 * 110) {
            ctx.strokeStyle = `rgba(245, 185, 69, ${(1 - Math.sqrt(d2) / 110) * 0.18})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Particles + cursor parallax
      for (const p of particles) {
        // mouse repulsion when within 120px
        const dx = p.x - mx;
        const dy = p.y - my;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        if (d < 130) {
          const force = (1 - d / 130) * (mouseRef.current.down ? 2.4 : 1.1);
          p.vx += (dx / d) * force * 0.25;
          p.vy += (dy / d) * force * 0.25;
        }

        p.x += p.vx;
        p.y += p.vy;
        // friction
        p.vx *= 0.96;
        p.vy *= 0.96;
        // drift
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;
        // bounds
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.fillStyle = `hsl(${p.hue} 90% 65% / 0.85)`;
        ctx.shadowColor = `hsl(${p.hue} 95% 60% / 0.7)`;
        ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    }

    function onMove(e: MouseEvent) {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - r.left;
      mouseRef.current.y = e.clientY - r.top;
    }
    function onTouch(e: TouchEvent) {
      if (!canvas || !e.touches[0]) return;
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = e.touches[0].clientX - r.left;
      mouseRef.current.y = e.touches[0].clientY - r.top;
    }
    function onDown() { mouseRef.current.down = true; }
    function onUp() { mouseRef.current.down = false; }

    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    io.observe(canvas);

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchend", onUp);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      {/* Pulsating radial gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-pulseGlow"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, rgba(245,185,69,0.25), transparent 65%), radial-gradient(50% 40% at 20% 70%, rgba(199,121,208,0.22), transparent 60%), radial-gradient(50% 40% at 80% 70%, rgba(75,192,200,0.18), transparent 60%)",
        }}
      />
      {/* Mesh grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)",
        }}
      />
      <canvas ref={canvasRef} className="particles-canvas" />
    </div>
  );
}
