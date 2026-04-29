"use client";
import { useEffect, useRef } from "react";

/**
 * Site-wide animated galaxy / particle field. A 150,000-point shader
 * point cloud that drifts, rotates, and reacts to scroll & cursor —
 * the same kind of motion as noomoagency.com/labs. This is mounted
 * once at the layout level as a fixed background, so every page
 * shares the same continuous canvas; sections of content scroll over
 * it and the camera tilts subtly with scroll progress, creating the
 * "everything is one continuous scene" effect.
 *
 * Performance: lazy-loads three.js, only mounts on devices that
 * support webgl + don't request reduced motion, throttles when the
 * tab is hidden, scales DPR down on mobile, automatically downgrades
 * to a CSS gradient fallback if WebGL fails.
 */
export default function GalaxyBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch {
        return;
      }
      if (disposed) return;

      // Detect WebGL support; bail to CSS fallback if missing.
      const test = document.createElement("canvas");
      const gl = test.getContext("webgl2") || test.getContext("webgl");
      if (!gl) return;

      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const isTablet = window.matchMedia("(max-width: 1100px)").matches;
      // Reduced counts again — was making a visibly-rectangular dense
      // cluster mid-page on long pages. Halving the outer torus is
      // the single most effective fix.
      const PARTICLE_COUNT_INNER = isMobile ? 1800 : isTablet ? 4500 : 6500;
      const PARTICLE_COUNT_OUTER = isMobile ? 2600 : isTablet ? 6500 : 9500;

      const scene = new THREE.Scene();
      // Transparent so layout overlays work
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
      camera.position.set(0, 4, 21);

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(isMobile ? 1 : 1.15, window.devicePixelRatio || 1));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      // ── Build the point cloud — inner sphere + outer torus ──
      const sizes: number[] = [];
      const shift: number[] = [];
      const pushShift = () => {
        shift.push(
          Math.random() * Math.PI,
          Math.random() * Math.PI * 2,
          (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
          Math.random() * 0.9 + 0.1,
        );
      };
      const pts: import("three").Vector3[] = [];
      for (let i = 0; i < PARTICLE_COUNT_INNER; i++) {
        sizes.push(Math.random() * 1.5 + 0.5);
        pushShift();
        pts.push(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5));
      }
      for (let i = 0; i < PARTICLE_COUNT_OUTER; i++) {
        const r = 10, R = 40;
        const rand = Math.pow(Math.random(), 1.5);
        const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
        // Was a thin disk (z between -1 and 1) — that geometry, viewed
        // from a tilted camera, formed a clearly-rectangular bright
        // band across the page. Make the outer cloud much taller (z
        // between -8 and 8) so it reads as a 3D cloud, not a disk.
        pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 16));
        sizes.push(Math.random() * 1.5 + 0.5);
        pushShift();
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(pts);
      geometry.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
      geometry.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

      const uniforms = { time: { value: 0 } };

      const material = new THREE.PointsMaterial({
        size: 0.125,
        transparent: true,
        depthTest: false,
        // Hardening: never write to the depth buffer either, otherwise
        // future transparent layers stacked above the cosmos can be
        // occluded incorrectly. Additive points should be pure overlay.
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      // `onBeforeCompile` is a method on THREE.Material, not a constructor
      // option in newer @types/three — assign it after construction.
      material.onBeforeCompile = (shader) => {
          (shader.uniforms as any).time = uniforms.time;
          shader.vertexShader = `
            uniform float time;
            attribute float sizes;
            attribute vec4 shift;
            varying vec3 vColor;
            varying float vTwinkle;
            ${shader.vertexShader}
          `
            // Per-star twinkle: each particle pulses on its own phase from
            // shift.y. Range 0.55..1.45 keeps the field clearly alive
            // without clipping the brightest ones.
            .replace(
              `gl_PointSize = size;`,
              `float twk = 0.55 + 0.9 * pow(0.5 + 0.5 * sin(time * 1.6 + shift.y * 7.0 + shift.x * 3.0), 2.0);
               vTwinkle = twk;
               gl_PointSize = size * sizes * twk;`,
            )
            .replace(
              `#include <color_vertex>`,
              `#include <color_vertex>
                float d = length(abs(position) / vec3(40., 10., 40));
                d = clamp(d, 0., 1.);
                vColor = mix(vec3(245., 185., 69.), vec3(167., 139., 250.), d) / 255.;
              `,
            )
            .replace(
              `#include <begin_vertex>`,
              `#include <begin_vertex>
                float t = time;
                float moveT = mod(shift.x + shift.z * t, PI2);
                float moveS = mod(shift.y + shift.z * t, PI2);
                transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
              `,
            );
          shader.fragmentShader = `
            varying vec3 vColor;
            varying float vTwinkle;
            ${shader.fragmentShader}
          `
            .replace(
              `void main() {`,
              // Declare `d` at the top of main() so it's always in scope
              // regardless of which #includes the THREE shader chunk
              // template uses (newer three drops the
              // `#include <clipping_planes_fragment>` line on materials
              // without clipping planes, which previously was our
              // only injection site for `d`).
              `void main() {
                float d = length(gl_PointCoord.xy - 0.5);`,
            )
            .replace(
              `vec4 diffuseColor = vec4( diffuse, opacity );`,
              // Twinkle modulates final alpha so brightness pulses too.
              `float aTw = smoothstep(0.55, 1.4, vTwinkle);
               vec4 diffuseColor = vec4( vColor * (0.85 + 0.4 * aTw), smoothstep(0.5, 0.1, d) * (0.65 + 0.45 * aTw) );`,
            );
      };

      const points = new THREE.Points(geometry, material);
      points.rotation.order = "ZYX";
      points.rotation.z = 0.2;
      scene.add(points);

      // ── Cursor / scroll reactivity ───────────────────────────
      const cursor = { x: 0, y: 0 };
      const target = { x: 0, y: 0, scrollPx: 0 };
      const onMouse = (e: MouseEvent) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 2;
        target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      const onScroll = () => {
        target.scrollPx = window.scrollY;
      };
      window.addEventListener("mousemove", onMouse, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });

      // THREE.Timer replaces the deprecated THREE.Clock (r168+). Unlike
      // Clock, Timer requires an explicit .update() call each frame before
      // reading elapsed time, giving the caller control over the time source.
      const clock = new THREE.Timer();
      let raf = 0;
      let visible = true;
      let lastRender = 0;
      const io = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      });
      io.observe(mount);
      const onVisibility = () => { visible = !document.hidden; };
      document.addEventListener("visibilitychange", onVisibility);

      const tick = () => {
        if (disposed) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        if (now - lastRender < 33) return;
        lastRender = now;
        // update() must be called first each frame so getElapsed() is current.
        clock.update();
        if (!visible) {
          return;
        }
        const t = clock.getElapsed() * 0.5;
        uniforms.time.value = t * Math.PI;

        // Cursor parallax
        cursor.x += (target.x - cursor.x) * 0.04;
        cursor.y += (target.y - cursor.y) * 0.04;

        // Scroll-driven tilt + zoom — feels like flying through the field.
        // Tamed: was diving from z=21 → z=13 (too close, particles
        // visually clump into a "white cluster" at the center of the
        // viewport on the lower half of the page). Now it eases from
        // z=21 → z=17 — same flying-through feel, no rectangular cluster.
        const scrollNorm = Math.min(1, target.scrollPx / Math.max(1, window.innerHeight * 4));
        camera.position.set(
          cursor.x * 1.6,
          4 + cursor.y * 1.4 - scrollNorm * 3,
          21 - scrollNorm * 4,
        );
        camera.lookAt(0, 0, 0);
        points.rotation.y = t * 0.05 + scrollNorm * 0.4;
        points.rotation.x = scrollNorm * 0.2;

        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        io.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    >
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(245,185,69,0.12), transparent 55%)," +
            "radial-gradient(ellipse at 75% 75%, rgba(167,139,250,0.18), transparent 55%)," +
            "linear-gradient(180deg, #07060c 0%, #0a0814 50%, #06060c 100%)",
        }}
      />
      {/* Soft radial vignette + edge fades — masks the WebGL canvas so
          the particle field never reads as a hard-edged "rectangular
          cluster" against the page content. The cosmos fades smoothly
          to ink-950 at every viewport edge. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 45%, transparent 0%, transparent 12%, rgba(5,6,10,0.55) 50%, rgba(5,6,10,0.92) 80%, rgb(5,6,10) 100%)",
        }}
      />
      {/* Top + bottom hard fades so edges always blend into the
          surrounding chrome (nav above, footer below). Larger on mobile
          where viewport is tall + narrow and the particle disc fills
          more of the visible area. */}
      <div
        className="absolute inset-x-0 top-0 h-[45vh]"
        style={{
          background:
            "linear-gradient(to bottom, rgb(5,6,10) 0%, rgba(5,6,10,0.92) 25%, rgba(5,6,10,0.5) 60%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[55vh]"
        style={{
          background:
            "linear-gradient(to top, rgb(10,12,20) 0%, rgba(10,12,20,0.95) 22%, rgba(10,12,20,0.65) 55%, transparent 100%)",
        }}
      />
    </div>
  );
}
