// galaxy.worker.js — multi-scene cosmic renderer, entirely off the main thread.
//
// ARCHITECTURE
// ────────────
// One OffscreenCanvas, one WebGL context, one render loop, on a Web Worker.
// All cinematic decoration across the site (planets, halos, nebulas, warp
// streaks, orbital rings, constellation dots, starfields) is rendered HERE.
// The DOM only paints the functional UI (text, cards, buttons). This is the
// Lusion / Nomoo Labs architecture: zero per-frame main-thread cost for
// background visuals.
//
// SCENES
// ──────
// • globalField — always-on point cloud galaxy (5500+ stars)
// • home        — central planet, halo ring, 3 nebula clouds, warp streaks
// • chapter     — orbital rings, constellation dots, dense local starfield
// • mentorship  — warm gold/violet aurora curtain
// • evade       — cool teal/violet drift field with shockwave streaks
// • store       — calm ambient nebula with subtle drift
//
// Pages activate scenes via postMessage({type:'scene', active:[…names]}).
// Inactive scenes have group.visible=false; their update() is skipped.
//
// MAIN-THREAD MESSAGES
// ────────────────────
//   init       — { canvas, width, height, dpr, isMobile, isTablet }
//   resize     — { width, height }
//   scroll     — { scrollPx }
//   mouse      — { x, y } in [-1, 1]
//   visibility — { visible }
//   scene      — { active: [name, …] }     ← NEW
//   destroy

import * as THREE from "three";

let disposed = false;
let renderer = null, scene = null, camera = null;
let raf = null;
let viewportH = 768;
let isMobileGlobal = false;

const cursor = { x: 0, y: 0 };
const target = { x: 0, y: 0, scrollPx: 0 };
let lastScrollAt = -Infinity;
let lastMouseAt  = -Infinity;
let lastRender   = 0;
let visible      = true;
let startTime    = 0;

// Scene registry — every scene exposes { group, update(t, scrollNorm, cursor) }
const sceneRegistry = {};
const activeScenes = new Set();

// ─── ENTRY ─────────────────────────────────────────────────────────────────
self.onmessage = ({ data }) => {
  switch (data.type) {
    case "init":       initRenderer(data); break;
    case "resize":     onResize(data.width, data.height); break;
    case "scroll":     target.scrollPx = data.scrollPx; lastScrollAt = performance.now(); break;
    case "mouse":      target.x = data.x; target.y = data.y; lastMouseAt = performance.now(); break;
    case "visibility": visible = data.visible; break;
    case "scene":      setActiveScenes(data.active || []); break;
    case "destroy":    destroy(); break;
  }
};

function setActiveScenes(names) {
  activeScenes.clear();
  // globalField is always-on regardless of incoming page request,
  // so the cosmic point cloud is never accidentally turned off
  // between page transitions.
  activeScenes.add("globalField");
  for (const n of names) activeScenes.add(n);
  for (const k of Object.keys(sceneRegistry)) {
    sceneRegistry[k].group.visible = activeScenes.has(k);
  }
}

// ─── RENDERER ──────────────────────────────────────────────────────────────
function initRenderer({ canvas, width, height, dpr, isMobile, isTablet }) {
  viewportH = height;
  isMobileGlobal = !!isMobile;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
  camera.position.set(0, 4, 21);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: isMobile ? "low-power" : "high-performance",
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(dpr, isMobile ? 1.25 : 1.5));
  renderer.setClearColor(0x000000, 0);

  // ─── Build all scenes once, hide them all by default ──
  sceneRegistry.globalField = buildGlobalField({ isMobile, isTablet });
  sceneRegistry.home        = buildHomeScene({ isMobile });
  sceneRegistry.chapter     = buildChapterScene({ isMobile });
  sceneRegistry.mentorship  = buildMentorshipScene({ isMobile });
  sceneRegistry.evade       = buildEvadeScene({ isMobile });
  sceneRegistry.store       = buildStoreScene({ isMobile });

  for (const k of Object.keys(sceneRegistry)) {
    sceneRegistry[k].group.visible = false;
    scene.add(sceneRegistry[k].group);
  }
  // Global field is always on by default; pages add 'home', 'chapter', etc.
  sceneRegistry.globalField.group.visible = true;
  activeScenes.add("globalField");

  startTime = performance.now();
  tick();
}

function onResize(width, height) {
  viewportH = height;
  if (!renderer || !camera) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function destroy() {
  disposed = true;
  if (raf) cancelAnimationFrame(raf);
  if (renderer) { renderer.dispose(); renderer = null; }
}

// ─── RENDER LOOP ───────────────────────────────────────────────────────────
function tick() {
  if (disposed) return;
  raf = requestAnimationFrame(tick);
  if (!visible) return;

  const now = performance.now();
  const isScrolling = now - lastScrollAt < 220;
  // During scroll on mobile we drop to ~25fps to stay smooth; idle = 30fps.
  // Desktop runs at full 60fps when scrolling for the cinematic feel.
  const minFrameMs = isMobileGlobal
    ? (isScrolling ? 60 : 33)
    : (isScrolling ? 16 : 22);
  if (now - lastRender < minFrameMs) return;
  lastRender = now;

  const t = ((now - startTime) / 1000);

  const cursorActive = now - lastMouseAt < 800 ||
    Math.abs(target.x - cursor.x) > 0.001 ||
    Math.abs(target.y - cursor.y) > 0.001;
  if (cursorActive) {
    cursor.x += (target.x - cursor.x) * 0.04;
    cursor.y += (target.y - cursor.y) * 0.04;
  }

  const scrollNorm = Math.min(1, target.scrollPx / Math.max(1, viewportH * 4));

  // Subtle camera parallax driven by cursor + scroll dolly
  camera.position.set(
    cursor.x * 1.6,
    4 + cursor.y * 1.4 - scrollNorm * 3,
    21 - scrollNorm * 4,
  );
  camera.lookAt(0, 0, 0);

  // Update every active scene
  for (const k of Object.keys(sceneRegistry)) {
    const s = sceneRegistry[k];
    if (s.group.visible) s.update(t, scrollNorm, cursor);
  }

  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCENE: globalField — always-on cosmic point cloud (replaces old galaxy)
// ═══════════════════════════════════════════════════════════════════════════
function buildGlobalField({ isMobile, isTablet }) {
  // Mobile star count was 80+80=160 — way under-utilised. Modern mobile GPUs
  // can render 2000+ point sprites with no measurable cost. Bump it.
  const INNER = isMobile ? 600  : isTablet ? 2200 : 4500;
  const OUTER = isMobile ? 900  : isTablet ? 3200 : 4800;

  const sizes = [], shift = [], pts = [];
  const pushShift = () => shift.push(
    Math.random() * Math.PI,
    Math.random() * Math.PI * 2,
    (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
    Math.random() * 0.9 + 0.1,
  );
  for (let i = 0; i < INNER; i++) {
    sizes.push(Math.random() * 1.5 + 0.5);
    pushShift();
    pts.push(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5));
  }
  for (let i = 0; i < OUTER; i++) {
    const r = 10, R = 40;
    const rand = Math.pow(Math.random(), 1.5);
    const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
    pts.push(new THREE.Vector3().setFromCylindricalCoords(
      radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 16,
    ));
    sizes.push(Math.random() * 1.5 + 0.5);
    pushShift();
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(pts);
  geometry.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

  const uniforms = { time: { value: 0 } };
  const material = new THREE.PointsMaterial({
    size: 0.125, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = uniforms.time;
    shader.vertexShader = [
      "uniform float time;",
      "attribute float sizes;",
      "attribute vec4 shift;",
      "varying vec3 vColor;",
      "varying float vTwinkle;",
      shader.vertexShader,
    ].join("\n")
      .replace(
        "gl_PointSize = size;",
        `float twk = 0.55 + 0.9 * pow(0.5 + 0.5 * sin(time * 1.6 + shift.y * 7.0 + shift.x * 3.0), 2.0);
         vTwinkle = twk;
         gl_PointSize = size * sizes * twk;`,
      )
      .replace(
        "#include <color_vertex>",
        `#include <color_vertex>
         float d = length(abs(position) / vec3(40., 10., 40));
         d = clamp(d, 0., 1.);
         vColor = mix(vec3(245., 185., 69.), vec3(167., 139., 250.), d) / 255.;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float t = time;
         float moveT = mod(shift.x + shift.z * t, 6.2831853);
         float moveS = mod(shift.y + shift.z * t, 6.2831853);
         transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;`,
      );
    shader.fragmentShader = [
      "varying vec3 vColor;",
      "varying float vTwinkle;",
      shader.fragmentShader,
    ].join("\n")
      .replace(
        "void main() {",
        "void main() { float d = length(gl_PointCoord.xy - 0.5);",
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `float aTw = smoothstep(0.55, 1.4, vTwinkle);
         vec4 diffuseColor = vec4(vColor * (0.85 + 0.4 * aTw), smoothstep(0.5, 0.1, d) * (0.65 + 0.45 * aTw));`,
      );
  };

  const points = new THREE.Points(geometry, material);
  points.rotation.order = "ZYX";
  points.rotation.z = 0.2;

  const group = new THREE.Group();
  group.add(points);

  return {
    group,
    update(t, scrollNorm) {
      uniforms.time.value = t * 0.5 * Math.PI;
      points.rotation.y = t * 0.025 + scrollNorm * 0.4;
      points.rotation.x = scrollNorm * 0.2;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCENE: home — central planet + halo ring + 3 nebula clouds + warp streaks
//  Replaces the DOM versions in CosmicJourney + HomeBackground.
// ═══════════════════════════════════════════════════════════════════════════
function buildHomeScene({ isMobile }) {
  const group = new THREE.Group();

  // ─── 1. CENTRAL PLANET ──
  // Sphere with custom radial-gradient + rim glow + light scattering shader.
  // Matches the CSS "warm cream → amber → violet → cyan" planet from the
  // CosmicJourney source.
  const planetUniforms = {
    time: { value: 0 },
    scroll: { value: 0 },
  };
  const planetGeo = new THREE.SphereGeometry(7.2, 64, 64);
  const planetMat = new THREE.ShaderMaterial({
    uniforms: planetUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float scroll;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewDir;
      void main() {
        // Light direction (top-left key light)
        vec3 lightDir = normalize(vec3(-0.6, 0.7, 0.8));
        float NdL = max(0.0, dot(vNormal, lightDir));
        float fres = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 2.4);

        // Surface gradient from warm cream → amber → violet → cyan
        // based on the lit hemisphere position
        vec3 cream  = vec3(1.00, 0.93, 0.70);
        vec3 amber  = vec3(0.96, 0.73, 0.27);
        vec3 violet = vec3(0.65, 0.55, 0.98);
        vec3 cyan   = vec3(0.13, 0.83, 0.93);

        float h = NdL;
        vec3 base = mix(violet, amber, smoothstep(0.2, 0.7, h));
        base = mix(base, cream, smoothstep(0.7, 1.0, h));
        // Dark side picks up cyan + violet (refraction-like)
        vec3 dark = mix(violet, cyan, 0.45) * 0.45;
        vec3 surface = mix(dark, base, NdL);

        // Rim glow (Lusion-grade light scattering hint)
        vec3 rim = mix(amber, violet, 0.5) * fres * 1.6;

        vec3 col = surface + rim;
        float alpha = 0.92 - scroll * 0.85;  // fade out as user scrolls past hero
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  planet.position.set(0, 0, 0);
  group.add(planet);

  // Lens-flare-style additive sprite around the planet (extra bloom kick)
  const flareGeo = new THREE.PlaneGeometry(28, 28);
  const flareMat = new THREE.ShaderMaterial({
    uniforms: planetUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // Always face the camera (billboarded)
        vec4 mvPos = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mvPos.xy += (uv - 0.5) * 28.0;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float scroll;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5);
        float core = smoothstep(0.5, 0.0, d) * 0.4;
        float halo = smoothstep(0.5, 0.18, d) * 0.6;
        vec3 warm = vec3(1.00, 0.78, 0.30);
        vec3 cool = vec3(0.65, 0.55, 0.98);
        vec3 col = mix(cool, warm, halo);
        float a = (core + halo * 0.55) * (1.0 - scroll * 0.85);
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const flare = new THREE.Mesh(flareGeo, flareMat);
  group.add(flare);

  // ─── 2. HALO RING ──
  // Thin glowing ring around the planet, like the 88vmin border in the source.
  const haloGeo = new THREE.RingGeometry(10.4, 10.7, 128, 1);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: planetUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float scroll;
      varying vec2 vUv;
      void main() {
        float pulse = 0.7 + 0.3 * sin(time * 0.7);
        vec3 col = mix(vec3(1.0, 0.88, 0.55), vec3(0.65, 0.55, 0.98), 0.5);
        float a = pulse * (1.0 - scroll * 0.9);
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI / 2;  // face camera
  group.add(halo);

  // ─── 3. NEBULA CLOUDS — 3 large additive quads with noise shader ──
  const nebulaUniforms = { time: { value: 0 }, scroll: { value: 0 } };
  const nebulaConfigs = [
    { x: -8, y:  3, z: -6, scale: 22, color: [0.65, 0.55, 0.98], strength: 0.55 }, // violet
    { x:  9, y: -2, z: -4, scale: 18, color: [0.13, 0.83, 0.93], strength: 0.42 }, // cyan
    { x:  0, y: -6, z: -8, scale: 24, color: [0.96, 0.73, 0.27], strength: 0.40 }, // amber
  ];
  for (const cfg of nebulaConfigs) {
    const nebGeo = new THREE.PlaneGeometry(cfg.scale, cfg.scale);
    const nebMat = new THREE.ShaderMaterial({
      uniforms: {
        ...nebulaUniforms,
        baseColor: { value: new THREE.Vector3(...cfg.color) },
        strength:  { value: cfg.strength },
        seed:      { value: Math.random() * 100 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float scroll;
        uniform vec3  baseColor;
        uniform float strength;
        uniform float seed;
        varying vec2 vUv;
        // Cheap fractional Brownian motion noise — three octaves is enough for
        // a slow drifting nebula at this size. Mobile GPU eats it for breakfast.
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          float a = hash(i), b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
          return v;
        }
        void main() {
          vec2 uv = vUv - 0.5;
          float r = length(uv);
          float drift = time * 0.04 + seed;
          float n = fbm(uv * 3.5 + vec2(drift, -drift * 0.6));
          float fall = smoothstep(0.5, 0.0, r);
          float a = fall * n * strength * (1.0 - scroll * 0.6);
          gl_FragColor = vec4(baseColor * (0.7 + n * 0.6), a);
        }
      `,
    });
    const neb = new THREE.Mesh(nebGeo, nebMat);
    neb.position.set(cfg.x, cfg.y, cfg.z);
    group.add(neb);
  }

  // ─── 4. WARP STREAKS — radial particle streaks that elongate with scroll ──
  // Replaces the DOM motion warp streaks + the CSS shooting-star filler.
  const STREAK_COUNT = isMobile ? 80 : 220;
  const streakPositions = new Float32Array(STREAK_COUNT * 3);
  const streakSeeds     = new Float32Array(STREAK_COUNT);
  for (let i = 0; i < STREAK_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 10;
    streakPositions[i * 3]     = Math.cos(angle) * r;
    streakPositions[i * 3 + 1] = Math.sin(angle) * r;
    streakPositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    streakSeeds[i] = Math.random();
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));
  streakGeo.setAttribute("seed",     new THREE.BufferAttribute(streakSeeds, 1));
  const streakUniforms = { time: { value: 0 }, scroll: { value: 0 } };
  const streakMat = new THREE.ShaderMaterial({
    uniforms: streakUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float time;
      uniform float scroll;
      attribute float seed;
      varying float vAlpha;
      void main() {
        float t = mod(time * 0.6 + seed * 6.28, 6.28);
        float life = (sin(t) * 0.5 + 0.5);
        // Streak elongates and pushes outward as scroll rises
        vec3 p = position * (1.0 + scroll * 1.2 + life * 0.6);
        vAlpha = life * (0.4 + scroll * 1.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + scroll * 6.0) * (0.6 + life);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vAlpha;
        gl_FragColor = vec4(1.0, 0.92, 0.74, a);
      }
    `,
  });
  const streaks = new THREE.Points(streakGeo, streakMat);
  group.add(streaks);

  return {
    group,
    update(t, scrollNorm) {
      planetUniforms.time.value = t;
      planetUniforms.scroll.value = scrollNorm;
      nebulaUniforms.time.value = t;
      nebulaUniforms.scroll.value = scrollNorm;
      streakUniforms.time.value = t;
      streakUniforms.scroll.value = scrollNorm;
      // Slight planet rotation
      planet.rotation.y = t * 0.05;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCENE: chapter — orbital rings + constellation dots + dense local stars
//  Replaces ChapterCosmos starfield + rings + dots.
// ═══════════════════════════════════════════════════════════════════════════
function buildChapterScene({ isMobile }) {
  const group = new THREE.Group();
  // Sit slightly behind the global field
  group.position.set(0, 0, -2);

  // Three orbital rings — RingGeometry with thin width
  const ringUniforms = { time: { value: 0 } };
  const rings = [];
  for (let i = 1; i <= 3; i++) {
    const r = i * 4.5;
    const geo = new THREE.RingGeometry(r, r + 0.04, 96, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...ringUniforms, ringIndex: { value: i } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float time;
        uniform float ringIndex;
        void main() {
          float pulse = 0.6 + 0.4 * sin(time * 0.4 + ringIndex);
          float a = (0.18 - ringIndex * 0.04) * pulse;
          gl_FragColor = vec4(1.0, 0.88, 0.55, a);
        }
      `,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    rings.push(ring);
    group.add(ring);
  }

  // Constellation dots — 5 colorful sprites
  const dotConfigs = [
    { x: -3.5, y:  2.0, color: [1.00, 0.88, 0.54] }, // amber
    { x:  3.0, y:  2.4, color: [0.65, 0.55, 0.98] }, // violet
    { x:  3.6, y: -1.5, color: [0.40, 0.91, 0.97] }, // cyan
    { x: -2.7, y: -2.5, color: [0.96, 0.45, 0.71] }, // pink
    { x:  0.3, y:  0.3, color: [1.00, 0.88, 0.54] }, // amber
  ];
  const dots = [];
  for (const cfg of dotConfigs) {
    const geo = new THREE.PlaneGeometry(0.6, 0.6);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time:  { value: 0 },
        color: { value: new THREE.Vector3(...cfg.color) },
        seed:  { value: Math.random() * 6.28 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3  color;
        uniform float seed;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5);
          float pulse = 0.55 + 0.45 * sin(time * 1.2 + seed);
          float core = smoothstep(0.5, 0.0, d) * pulse;
          float glow = smoothstep(0.5, 0.15, d) * pulse * 0.4;
          gl_FragColor = vec4(color, core + glow);
        }
      `,
    });
    const dot = new THREE.Mesh(geo, mat);
    dot.position.set(cfg.x, cfg.y, 0);
    dots.push({ mesh: dot, mat });
    group.add(dot);
  }

  // Dense local starfield around the chapter region — 24 sprites at random
  // positions with twinkle.
  const STAR_COUNT = isMobile ? 30 : 60;
  const starUniforms = { time: { value: 0 } };
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starSeeds = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    starPositions[i * 3]     = (Math.random() - 0.5) * 18;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 18;
    starPositions[i * 3 + 2] = -1 + Math.random() * 2;
    starSeeds[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute("seed",     new THREE.BufferAttribute(starSeeds, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float time;
      attribute float seed;
      varying float vAlpha;
      void main() {
        float twk = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(time * 1.4 + seed * 6.28), 2.0);
        vAlpha = twk;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (1.5 + seed * 2.5) * twk;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vAlpha;
        gl_FragColor = vec4(1.0, 0.95, 0.85, a);
      }
    `,
  });
  const stars = new THREE.Points(starGeo, starMat);
  group.add(stars);

  return {
    group,
    update(t) {
      ringUniforms.time.value = t;
      starUniforms.time.value = t;
      for (const d of dots) d.mat.uniforms.time.value = t;
      group.rotation.z = t * 0.02;  // very slow spin
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCENE: mentorship — warm gold + violet aurora curtain
// ═══════════════════════════════════════════════════════════════════════════
function buildMentorshipScene({ isMobile }) {
  const group = new THREE.Group();
  group.position.set(0, 0, -3);

  const auroraUniforms = { time: { value: 0 } };
  const geo = new THREE.PlaneGeometry(48, 30, 1, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: auroraUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      void main() {
        vec2 uv = vUv;
        float band1 = noise(vec2(uv.x * 4.0, uv.y * 2.0 + time * 0.15));
        float band2 = noise(vec2(uv.x * 7.0 - time * 0.1, uv.y * 1.5));
        float curtain = smoothstep(0.4, 0.7, band1) * smoothstep(0.3, 0.8, band2);
        vec3 gold   = vec3(1.00, 0.78, 0.30);
        vec3 violet = vec3(0.65, 0.55, 0.98);
        vec3 col = mix(violet, gold, band1);
        gl_FragColor = vec4(col, curtain * 0.4);
      }
    `,
  });
  const curtain = new THREE.Mesh(geo, mat);
  group.add(curtain);

  return {
    group,
    update(t) { auroraUniforms.time.value = t; },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCENE: evade — cool teal + violet drift with shockwave streaks
// ═══════════════════════════════════════════════════════════════════════════
function buildEvadeScene({ isMobile }) {
  const group = new THREE.Group();
  group.position.set(0, 0, -3);

  const fieldUniforms = { time: { value: 0 } };
  const geo = new THREE.PlaneGeometry(50, 32);
  const mat = new THREE.ShaderMaterial({
    uniforms: fieldUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv - 0.5;
        float r = length(uv);
        float wave = 0.5 + 0.5 * sin(r * 18.0 - time * 1.4);
        float fall = smoothstep(0.5, 0.0, r);
        vec3 teal   = vec3(0.13, 0.83, 0.93);
        vec3 violet = vec3(0.55, 0.45, 0.95);
        vec3 col = mix(violet, teal, wave);
        gl_FragColor = vec4(col, fall * wave * 0.35);
      }
    `,
  });
  const field = new THREE.Mesh(geo, mat);
  group.add(field);

  return {
    group,
    update(t) { fieldUniforms.time.value = t; },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCENE: store — calm ambient nebula
// ═══════════════════════════════════════════════════════════════════════════
function buildStoreScene({ isMobile }) {
  const group = new THREE.Group();
  group.position.set(0, 0, -4);

  const ambUniforms = { time: { value: 0 } };
  const geo = new THREE.PlaneGeometry(45, 28);
  const mat = new THREE.ShaderMaterial({
    uniforms: ambUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      void main() {
        vec2 uv = vUv - 0.5;
        float r = length(uv);
        float n = noise(uv * 4.0 + vec2(time * 0.05, -time * 0.03));
        float fall = smoothstep(0.55, 0.0, r);
        vec3 col = mix(vec3(0.15, 0.65, 0.92), vec3(0.55, 0.45, 0.95), n);
        gl_FragColor = vec4(col, fall * n * 0.3);
      }
    `,
  });
  const ambient = new THREE.Mesh(geo, mat);
  group.add(ambient);

  return {
    group,
    update(t) { ambUniforms.time.value = t; },
  };
}
