"use client";
import { useEffect, useRef } from "react";

/**
 * Full-page animated particle background with pulsating blue glow.
 * Particles float, drift, and respond to scroll position.
 * Canvas-based for smooth 60fps performance.
 */
export default function AnimatedParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = window.innerWidth;
    let h = window.innerHeight;
    let scrollY = 0;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Particle system
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      phase: number;
    }

    const particles: Particle[] = [];
    const particleCount = 60;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let animationFrameId: number;
    let time = 0;
    let scrollVelocity = 0;
    let lastScrollY = 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      time += 1;

      // Calculate scroll velocity for particle speedup
      const deltaScroll = scrollY - lastScrollY;
      scrollVelocity = lerp(scrollVelocity, Math.abs(deltaScroll) * 2, 0.15);
      lastScrollY = scrollY;

      const pulse = Math.sin(time * 0.005) * 0.3 + 0.7; // Pulsating effect

      // Background gradient (pulsating blue)
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      const baseColor1 = `rgba(5, 6, 10, ${pulse * 0.95})`;
      const baseColor2 = `rgba(15, 25, 50, ${pulse * 0.9})`;

      gradient.addColorStop(0, baseColor1);
      gradient.addColorStop(0.5, baseColor2);
      gradient.addColorStop(1, baseColor1);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Add soft blue glow overlay
      ctx.fillStyle = `rgba(34, 211, 238, ${(pulse * 0.08 - 0.04) * Math.sin(time * 0.008)})`;
      ctx.fillRect(0, 0, w, h);

      // Radial glow from top-left
      const radialGrad = ctx.createRadialGradient(w * 0.1, h * 0.1, 0, w * 0.5, h * 0.5, w);
      radialGrad.addColorStop(0, `rgba(34, 211, 238, ${pulse * 0.1})`);
      radialGrad.addColorStop(1, `rgba(34, 211, 238, 0)`);
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, w, h);

      // Update and draw particles
      particles.forEach((p) => {
        // Always moving even without scroll + accelerate on scroll
        const baseSpeed = 1 + scrollVelocity * 0.5;
        p.x += p.vx * baseSpeed;
        p.y += p.vy * baseSpeed + (scrollY * 0.15 + scrollVelocity * 0.3); // Scroll drift + acceleration
        p.phase += 0.02 + scrollVelocity * 0.01;

        // Wrap around with padding
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // Pulsate opacity and size with scroll
        const basePulseOpacity = p.opacity * (Math.sin(p.phase) * 0.5 + 1);
        const scrollBoost = 1 + scrollVelocity * 0.1;
        const pulseOpacity = Math.min(1, basePulseOpacity * scrollBoost);
        const sizeBoost = 1 + scrollVelocity * 0.05;

        // Draw particle with glow
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3 * sizeBoost);
        glowGrad.addColorStop(0, `rgba(34, 211, 238, ${pulseOpacity * 0.6})`);
        glowGrad.addColorStop(1, `rgba(34, 211, 238, 0)`);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3 * sizeBoost, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.fillStyle = `rgba(255, 255, 255, ${pulseOpacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * sizeBoost, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
    };

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 h-screen w-full"
      style={{ display: "block" }}
    />
  );
}
