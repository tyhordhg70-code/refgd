"use client";
import { useCosmicScene } from "@/lib/cosmic-scene";

/**
 * Tiny client-only component that flips a worker-rendered cosmic
 * scene on while it is mounted. Renders nothing.
 *
 * Use this from server components (which cannot call the
 * `useCosmicScene` hook directly) — drop a single
 *   <SceneActivator name="evade" />
 * anywhere inside the page tree.
 */
export default function SceneActivator({ name }: { name: string }) {
  useCosmicScene(name);
  return null;
}
