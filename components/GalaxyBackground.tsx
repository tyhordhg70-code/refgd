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
      const PARTICLE_COUNT_INNER = isMobile ? 18000 : 50000;
      const PARTICLE_COUNT_OUTER = isMobile ? 30000 : 100000;

      const scene = new THREE.Scene();
      // Transparent so layout overlays work
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
      camera.position.set(0, 4, 21);

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(isMobile ? 1.25 : 1.75, window.devicePixelRatio || 1));
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
        pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2));
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
              `#include <clipping_planes_fragment>`,
              `#include <clipping_planes_fragment>
                float d = length(gl_PointCoord.xy - 0.5);
              `,
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

      const clock = new THREE.Clock();
      let raf = 0;
      let visible = true;
      const io = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      });
      io.observe(mount);
      const onVisibility = () => { visible = !document.hidden; };
      document.addEventListener("visibilitychange", onVisibility);

      const tick = () => {
        if (disposed) return;
        if (!visible) {
          raf = requestAnimationFrame(tick);
          return;
        }
        const t = clock.getElapsedTime() * 0.5;
        uniforms.time.value = t * Math.PI;

        // Cursor parallax
        cursor.x += (target.x - cursor.x) * 0.04;
        cursor.y += (target.y - cursor.y) * 0.04;

        // Scroll-driven tilt + zoom — feels like flying through the field
        const scrollNorm = Math.min(1, target.scrollPx / Math.max(1, window.innerHeight * 4));
        camera.position.set(
          cursor.x * 1.6,
          4 + cursor.y * 1.4 - scrollNorm * 6,
          21 - scrollNorm * 8,
        );
        camera.lookAt(0, 0, 0);
        points.rotation.y = t * 0.05 + scrollNorm * 0.6;
        points.rotation.x = scrollNorm * 0.35;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
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
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, rgba(245,185,69,0.12), transparent 55%)," +
          "radial-gradient(ellipse at 75% 75%, rgba(167,139,250,0.18), transparent 55%)," +
          "linear-gradient(180deg, #07060c 0%, #0a0814 50%, #06060c 100%)",
      }}
    />
  );
}
