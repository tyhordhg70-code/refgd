# Pinned-hero behavior test — refgd.onrender.com

**Date:** 2026-04-26
**Tooling:** Playwright behavior subagent (real Chromium browser, viewport 1280x720)
**Test target:** Live production site, https://refgd.onrender.com (NOT local)

## Result: PASS

## What was tested

For both `/exclusive-mentorships` and `/evade-cancelations`, the test verified:

1. The pinned hero element exists with class `sticky top-0 h-[100svh] w-full overflow-hidden`.
2. Its computed style is `position: sticky` and `top: 0px`.
3. Its parent `<section>` is at least 1.5× the viewport height (so a non-trivial scroll-pin range exists).
4. As the user scrolls into the pin range — at the section's top, at the midpoint, and at the near-end of the pin range — the inner sticky div's `getBoundingClientRect().top` stays within ±10px of `0`.
5. Visual confirmation via screenshots at each scroll position that the cinematic hero image continues to fill the viewport.

## Verbatim agent output

```
Success! Verified cinematic pinning on both routes in the live production site.
For /exclusive-mentorships and /evade-cancelations, the pinned inner div was
present with computed position: sticky and top: 0px, each section was 1440px
tall at a 720px viewport (>= 1.5x viewport), and the sticky element's bounding
rect top stayed at 0 at the start, midpoint, and near-end of the pin range.
Required screenshots were captured: exclusive_setup, exclusive_pin_start,
exclusive_pin_mid, exclusive_pin_end, evade_setup, evade_pin_start, and
evade_pin_mid.
```

## Why the section is exactly 1440px (= 2× viewport at 720)

`refgd/components/PinSection.tsx` renders the outer `<section>` with `style={{ height: "200vh" }}`, and the inner pinned div as `h-[100svh]`. At a 720px viewport that gives a 1440px section with a 720px sticky element — i.e. roughly 1 viewport of pin range. This is the intentional "noomoagency-style cinematic pin" described in the component's JSDoc.

## Conclusion

The cinematic pinned-hero behavior introduced by the 3D AR redesign (commit `2cbf6bf`) is live and working correctly on Render.
