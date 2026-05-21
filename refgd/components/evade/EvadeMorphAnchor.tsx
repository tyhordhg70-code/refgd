"use client";
  import { useEffect, useRef, useState } from "react";
  import { useReducedMotion } from "framer-motion";

  /**
   * EvadeMorphAnchor — single shared 3D wireframe object that lives
   * behind the entire page and morphs as the user scrolls
   * (cube → shield → planet). One fixed full-viewport canvas, one
   * three.js scene, three line-wireframe meshes crossfaded based on
   * scroll progress through the page. Sits between EvadeImmersiveBg
   * (z = -10/-20) and the page content (z >= 10) so it reads as a
   * 3D anchor object the user is moving through.
   *
   * • Lazy-loads three.js via dynamic import so it stays out of the
   *   initial JS bundle.
   * • Mounts NOTHING on mobile (matchMedia max-width 1023) and on
   *   prefers-reduced-motion — exactly the static-fallback case the
   *   task calls for.
   * • Additive blending + low opacity so it complements (rather than
   *   competes with) the existing cosmic background and the
   *   per-section accent gradients.
   * • No new background particles, dust, or atmospherics — meets the
   *   "out of scope" constraint from the task.
   */
  export default function EvadeMorphAnchor() {
    const reduced = useReducedMotion();
    const containerRef = useRef<HTMLDivElement>(null);
    const [enabled, setEnabled] = useState(false);

    // Gate to desktop, non-reduced-motion only.
    useEffect(() => {
      if (reduced) return;
      if (typeof window === "undefined") return;
      if (window.matchMedia("(max-width: 1023px)").matches) return;
      setEnabled(true);
    }, [reduced]);

    useEffect(() => {
      if (!enabled) return;
      let disposed = false;
      let cleanup: (() => void) | null = null;
      let rafId = 0;

      (async () => {
        const THREE = await import("three");
        if (disposed || !containerRef.current) return;
        const container = containerRef.current;

        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        renderer.setClearColor(0x000000, 0);
        const dom = renderer.domElement;
        dom.style.position = "absolute";
        dom.style.inset = "0";
        dom.style.width = "100%";
        dom.style.height = "100%";
        dom.style.pointerEvents = "none";
        container.appendChild(dom);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        camera.position.set(0, 0, 5.2);

        const mkMat = (color: number) =>
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });

        // Three wireframe targets: cube (chapters 01-02), shield (mid),
        // planet (pricing + lower). Each is a LineSegments wireframe.
        const cube = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(1.85, 1.85, 1.85, 3, 3, 3)),
          mkMat(0x22d3ee),
        );
        const shield = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.65, 2)),
          mkMat(0xa78bfa),
        );
        const planet = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.7, 3)),
          mkMat(0xf5b945),
        );
        scene.add(cube, shield, planet);

        const onResize = () => {
          const W = container.clientWidth || window.innerWidth;
          const H = container.clientHeight || window.innerHeight;
          renderer.setSize(W, H);
          camera.aspect = W / H;
          camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", onResize);

        let scrollProg = 0;
        const onScroll = () => {
          const doc = document.documentElement;
          const max = doc.scrollHeight - window.innerHeight;
          scrollProg = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });

        let t = 0;
        const fade = (a: number, b: number, x: number) => {
          if (b === a) return x >= a ? 1 : 0;
          return Math.max(0, Math.min(1, (x - a) / (b - a)));
        };
        const tick = () => {
          if (disposed) return;
          t += 0.006;
          const p = scrollProg;

          // crossfade windows:
          //   cube   visible  0.00 - 0.45
          //   shield visible  0.30 - 0.75
          //   planet visible  0.60 - 1.00
          const oCube   = (1 - fade(0.35, 0.55, p)) * 0.55;
          const oShield = Math.min(fade(0.30, 0.45, p), 1 - fade(0.60, 0.80, p)) * 0.55;
          const oPlanet = fade(0.60, 0.80, p) * 0.55;
          (cube.material   as any).opacity = oCube;
          (shield.material as any).opacity = oShield;
          (planet.material as any).opacity = oPlanet;

          [cube, shield, planet].forEach((m, i) => {
            m.rotation.x = t * (0.32 + i * 0.06) + p * 1.2;
            m.rotation.y = t * (0.42 + i * 0.05) + p * 0.8;
            const s = 1 + 0.04 * Math.sin(t * 1.4 + i * 1.7) + p * 0.15;
            m.scale.setScalar(s);
          });

          renderer.render(scene, camera);
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        cleanup = () => {
          if (rafId) cancelAnimationFrame(rafId);
          window.removeEventListener("resize", onResize);
          window.removeEventListener("scroll", onScroll);
          [cube, shield, planet].forEach((m) => {
            m.geometry.dispose();
            (m.material as any).dispose();
          });
          renderer.dispose();
          if (dom.parentNode === container) container.removeChild(dom);
        };
      })().catch(() => {
        // If three fails to load, silently no-op — page still works.
      });

      return () => {
        disposed = true;
        cleanup?.();
      };
    }, [enabled]);

    // Always render the container (even pre-mount) so layout is
    // identical on first paint. The canvas is appended inside it.
    return (
      <div
        ref={containerRef}
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          mixBlendMode: "screen",
          opacity: 0.85,
        }}
      />
    );
  }
  