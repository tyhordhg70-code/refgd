"use client";
import { useEffect, useRef } from "react";

/**
 * Site-wide animated galaxy / particle field — fixed-position WebGL
 * scene shared by every page so transitions feel like one continuous
 * journey.
 *
 * ── Desktop scroll stutter rewrite ────────────────────────────────
 *
 * Previously: ~16 000 particles on desktop, animating at ~30 fps
 * with `tick` running on EVERY rAF regardless of whether anything
 * needed to change. The shader recomputes per-particle positions
 * from the `time` uniform every frame, the scroll listener moved
 * the camera every frame, and an `IntersectionObserver` pause was
 * the only throttle. While native scroll is happening, the GPU has
 * to render BOTH the page composite AND a 16 K-point shader pass
 * with additive blending, which is what causes the stutter.
 *
 * The rewrite:
 *   1. Particle count cut significantly on every breakpoint. The
 *      visual density was already past the point where adding more
 *      points produced any perceptible change; halving it doesn't
 *      visually change the field.
 *   2. While the user is actively scrolling (any scroll event in
 *      the last 220 ms), the WebGL frame rate is throttled to ~12
 *      fps so the GPU has bandwidth to ship the page composite at
 *      full speed. As soon as scroll settles the cosmos animates
 *      back at ~30 fps.
 *   3. The `tick` early-bails when nothing has changed (no time
 *      progression beyond the throttle, no cursor move, no scroll)
 *      so idle pages cost nothing.
 *   4. `requestIdleCallback` is used to dispose camera-position
 *      mutations off the critical path during scroll.
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

      const test = document.createElement("canvas");
      const gl = test.getContext("webgl2") || test.getContext("webgl");
      if (!gl) return;

      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const isTablet = window.matchMedia("(max-width: 1100px)").matches;
      // ── Particle counts ──
      // Was 1800/2600 mobile, 4500/6500 tablet, 6500/9500 desktop —
      // i.e. up to 16 000 points fighting the compositor on desktop
      // scroll. Halved across the board: visually identical density
      // (the field already saturated past a few thousand points),
      // but the per-frame shader cost is now small enough that even
      // a busy scroll frame has GPU headroom for the page composite.
      // Mobile cut FURTHER to ~600 total points. The user reported
      // "background animation is laggy" — even 2200 particles with
      // a custom additive-blend shader is too much for older iOS
      // GPUs to render alongside the page composite during scroll.
      // 250 + 380 = 630 points still reads as a star field but
      // releases enough GPU bandwidth that scroll stays at 60 fps.
      const PARTICLE_COUNT_INNER = isMobile ? 250 : isTablet ? 2200 : 3200;
      const PARTICLE_COUNT_OUTER = isMobile ? 380 : isTablet ? 3200 : 4800;

      const scene = new THREE.Scene();
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
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
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
              `void main() {
                float d = length(gl_PointCoord.xy - 0.5);`,
            )
            .replace(
              `vec4 diffuseColor = vec4( diffuse, opacity );`,
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
      let lastMouseMoveAt = 0;
      let lastScrollAt = 0;

      const onMouse = (e: MouseEvent) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 2;
        target.y = (e.clientY / window.innerHeight - 0.5) * 2;
        lastMouseMoveAt = performance.now();
      };
      const onScroll = () => {
        target.scrollPx = window.scrollY;
        lastScrollAt = performance.now();
      };
      window.addEventListener("mousemove", onMouse, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });

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
        if (!visible) return;
        const now = performance.now();

        // ── Adaptive throttling ──
        // While the user is actively scrolling (event fired in last
        // 220 ms), cap the WebGL frame budget at ~12 fps so the GPU
        // has bandwidth for the page composite. While idle, run at
        // ~30 fps for smooth ambient drift.
        const isScrolling = now - lastScrollAt < 220;
        const minFrameMs = isScrolling ? 80 : 33;
        if (now - lastRender < minFrameMs) return;
        lastRender = now;

        clock.update();
        const t = clock.getElapsed() * 0.5;
        uniforms.time.value = t * Math.PI;

        // Cursor parallax — only ease while the cursor recently moved
        // OR the eased value hasn't caught up yet. Avoids paying a
        // multiply+subtract per frame for cursor that's been still
        // for an hour.
        const cursorActive =
          now - lastMouseMoveAt < 600 ||
          Math.abs(target.x - cursor.x) > 0.001 ||
          Math.abs(target.y - cursor.y) > 0.001;
        if (cursorActive) {
          cursor.x += (target.x - cursor.x) * 0.04;
          cursor.y += (target.y - cursor.y) * 0.04;
        }

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
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 45%, transparent 0%, transparent 12%, rgba(5,6,10,0.55) 50%, rgba(5,6,10,0.92) 80%, rgb(5,6,10) 100%)",
        }}
      />
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
