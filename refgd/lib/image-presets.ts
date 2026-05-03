/**
 * v6.13.14 — Animation templates exposed in the EditableImage admin
 * popover. Each entry maps to a CSS class defined in app/globals.css.
 *
 * All templates are pure GPU compositor properties (transform / opacity
 * / filter) so they run on the GPU thread, never trigger layout, and
 * never fight the page's smooth scroll.
 *
 * To add a template:
 *   1. Add a `@keyframes atpl-<name>` and matching `.atpl-<name>`
 *      class to app/globals.css.
 *   2. Add a row to ANIMATION_TEMPLATES below.
 * The dropdown picks up new entries automatically.
 */
export const ANIMATION_TEMPLATES = [
  { cls: "atpl-float",        label: "Float — gentle Y bob" },
  { cls: "atpl-pulse",        label: "Pulse — scale breath" },
  { cls: "atpl-tilt",         label: "Tilt — rotateY sway" },
  { cls: "atpl-shimmer",      label: "Shimmer — rim-light sweep" },
  { cls: "atpl-3d-bob",       label: "3D bob — perspective tilt + lift" },
  { cls: "atpl-spin-slow",    label: "Spin slow — 30s rotation" },
  { cls: "atpl-glow-cycle",   label: "Glow cycle — colour halo (gold→violet→cyan)" },
  { cls: "atpl-zoom-breathe", label: "Zoom — slow zoom 1↔1.06" },
] as const;

export type AnimationTemplate = (typeof ANIMATION_TEMPLATES)[number];
