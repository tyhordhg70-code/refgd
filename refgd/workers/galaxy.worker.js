
// galaxy.worker.js — Three.js galaxy entirely off the main thread.
// Main thread sends: init, resize, scroll, mouse, visibility, destroy

import * as THREE from 'three';

let disposed = false;
let renderer = null, scene = null, camera = null, points = null, uniforms = null;
let raf = null;
let viewportH = 768;
const cursor = { x: 0, y: 0 };
const target = { x: 0, y: 0, scrollPx: 0 };
let lastScrollAt = -Infinity;
let lastMouseAt  = -Infinity;
let lastRender   = 0;
let visible      = true;
let startTime    = 0;

self.onmessage = ({ data }) => {
  switch (data.type) {
    case 'init':       initGalaxy(data); break;
    case 'resize':     onResize(data.width, data.height); break;
    case 'scroll':     target.scrollPx = data.scrollPx; lastScrollAt = performance.now(); break;
    case 'mouse':      target.x = data.x; target.y = data.y; lastMouseAt = performance.now(); break;
    case 'visibility': visible = data.visible; break;
    case 'destroy':    destroy(); break;
  }
};

function initGalaxy({ canvas, width, height, dpr, isMobile, isTablet }) {
  viewportH = height;
  const INNER = isMobile ? 80 : isTablet ? 2200 : 4500;
  const OUTER = isMobile ? 80 : isTablet ? 3200 : 4800;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
  camera.position.set(0, 4, 21);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(dpr, isMobile ? 1 : 1.15));
  renderer.setClearColor(0x000000, 0);

  // Build geometry
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
    pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 16));
    sizes.push(Math.random() * 1.5 + 0.5);
    pushShift();
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(pts);
  geometry.setAttribute('sizes', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('shift', new THREE.Float32BufferAttribute(shift, 4));

  uniforms = { time: { value: 0 } };
  const material = new THREE.PointsMaterial({
    size: 0.125, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = uniforms.time;
    shader.vertexShader = [
      'uniform float time;',
      'attribute float sizes;',
      'attribute vec4 shift;',
      'varying vec3 vColor;',
      'varying float vTwinkle;',
      shader.vertexShader,
    ].join('\n')
      .replace(
        'gl_PointSize = size;',
        `float twk = 0.55 + 0.9 * pow(0.5 + 0.5 * sin(time * 1.6 + shift.y * 7.0 + shift.x * 3.0), 2.0);
         vTwinkle = twk;
         gl_PointSize = size * sizes * twk;`
      )
      .replace(
        '#include <color_vertex>',
        `#include <color_vertex>
         float d = length(abs(position) / vec3(40., 10., 40));
         d = clamp(d, 0., 1.);
         vColor = mix(vec3(245., 185., 69.), vec3(167., 139., 250.), d) / 255.;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float t = time;
         float moveT = mod(shift.x + shift.z * t, 6.2831853);
         float moveS = mod(shift.y + shift.z * t, 6.2831853);
         transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;`
      );
    shader.fragmentShader = [
      'varying vec3 vColor;',
      'varying float vTwinkle;',
      shader.fragmentShader,
    ].join('\n')
      .replace(
        'void main() {',
        'void main() { float d = length(gl_PointCoord.xy - 0.5);'
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `float aTw = smoothstep(0.55, 1.4, vTwinkle);
         vec4 diffuseColor = vec4(vColor * (0.85 + 0.4 * aTw), smoothstep(0.5, 0.1, d) * (0.65 + 0.45 * aTw));`
      );
  };

  points = new THREE.Points(geometry, material);
  points.rotation.order = 'ZYX';
  points.rotation.z = 0.2;
  scene.add(points);

  startTime = performance.now();
  tick();
}

function tick() {
  if (disposed) return;
  raf = requestAnimationFrame(tick);
  if (!visible) return;

  const now = performance.now();
  const isScrolling = now - lastScrollAt < 220;
  const minFrameMs = isScrolling ? 80 : 33;
  if (now - lastRender < minFrameMs) return;
  lastRender = now;

  const t = ((now - startTime) / 1000) * 0.5;
  uniforms.time.value = t * Math.PI;

  const cursorActive = now - lastMouseAt < 600 ||
    Math.abs(target.x - cursor.x) > 0.001 ||
    Math.abs(target.y - cursor.y) > 0.001;
  if (cursorActive) {
    cursor.x += (target.x - cursor.x) * 0.04;
    cursor.y += (target.y - cursor.y) * 0.04;
  }

  const scrollNorm = Math.min(1, target.scrollPx / Math.max(1, viewportH * 4));
  camera.position.set(cursor.x * 1.6, 4 + cursor.y * 1.4 - scrollNorm * 3, 21 - scrollNorm * 4);
  camera.lookAt(0, 0, 0);
  points.rotation.y = t * 0.05 + scrollNorm * 0.4;
  points.rotation.x = scrollNorm * 0.2;

  renderer.render(scene, camera);
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
