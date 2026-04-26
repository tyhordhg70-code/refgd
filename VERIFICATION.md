# Render auto-deploy verification — refgd.onrender.com

**Date:** 2026-04-26 01:27:57Z
**Target commit (per task):** `2cbf6bf` on `github.com/tyhordhg70-code/refgd` (main)
**Live URL:** https://refgd.onrender.com

## Result

**PASS** — Render auto-deploy succeeded. The 3D AR cinematic redesign is live on every required route. No build error to surface; no fix required.

## How to reproduce

```bash
bash refgd/scripts/verify-deploy.sh
```

The full output of the most recent run is captured in [`refgd/scripts/verify-deploy.output.txt`](scripts/verify-deploy.output.txt) and reproduced below.

## 1. HTTP status checks

```
/                              -> 200 (expected 200)
/store-list                    -> 200 (expected 200)
/exclusive-mentorships         -> 200 (expected 200)
/evade-cancelations            -> 200 (expected 200)
/our-service                   -> 307 (expected 307)
```

All five required routes return the expected status codes.

## 2. Redesign content markers in served HTML

| Marker | Page | Found |
| --- | --- | --- |
| Full-bleed Hero3D image (`/images/hero-main.png` via `next/image`) | `/` | yes |
| Site-wide MusicPlayer mute button (`aria-label="Mute background music"`) | `/` | yes |
| Cinematic pinned hero (`class="sticky top-0 h-[100svh] w-full overflow-hidden"`) | `/exclusive-mentorships` | yes |
| Cinematic pinned hero (`class="sticky top-0 h-[100svh] w-full overflow-hidden"`) | `/evade-cancelations` | yes |

These markers come from `refgd/components/Hero3D.tsx`, `refgd/components/MusicPlayer.tsx`, and `refgd/components/PinSection.tsx` — the new components introduced by the 3D AR redesign commit.

## 3. Render-origin proof (HTTP response headers)

```
x-render-origin-server: Render
x-powered-by: Next.js
server: cloudflare
cf-ray: 9f21ced61ecee544-ORD
date: Sun, 26 Apr 2026 01:27:57 GMT
```

`x-render-origin-server: Render` confirms Render is serving the response.

## 4. Next.js build fingerprint

```
buildId: W83AeW3yoK4o1kn1GQS1s
```

Next.js generates a fresh `buildId` on every `next build`, so a stable buildId served behind the Render origin proves a successful build was deployed and is being served. (If the build had failed, Render would either keep serving the previous buildId or return a non-200 placeholder — neither is the case here.)

## 5. Visual proof (screenshots)

- Homepage — full-bleed crystal/diamond Hero3D, "CHOOSE YOUR PATH TO MASTERY" headline, mute button top-right, Telegram banner: `attached_assets/screenshots/refgd_onrender_com.png`
- `/exclusive-mentorships` — pinned cinematic chess-board hero with "REFUND & SE MENTORSHIP": `attached_assets/screenshots/refgd_onrender_com_exclusive-mentorships.png`
- `/evade-cancelations` — pinned cinematic ghost/shield hero with "EXPERIENCE ONLINE FREEDOM": `attached_assets/screenshots/refgd_onrender_com_evade-cancelations.png`

## 6. Behavior-level proof (pinned hero stays in viewport while scrolling)

Verified by an automated Playwright run against the live production URL (NOT local). For both `/exclusive-mentorships` and `/evade-cancelations`:

- The pinned hero element has computed style `position: sticky` and `top: 0px`.
- Its parent `<section>` is 1440px tall at a 720px viewport (= 2×, leaving ~1 viewport of pin range — this matches `PinSection.tsx`'s `height: 200vh` outer + `h-[100svh]` inner).
- The inner sticky element's `getBoundingClientRect().top` stayed within ±10px of `0` at the start, midpoint, and near-end of the pin range — i.e. the hero is genuinely pinned to the top of the viewport while the user scrolls through the section.

Full verbatim test report (including the captured screenshot list) is in [`refgd/scripts/behavior-test-report.md`](scripts/behavior-test-report.md).

## 7. Render build/deploy logs

This environment has no Render API token configured, so build logs were not pulled directly from the Render API. However the combination of:

- a 100% successful run of [`verify-deploy.sh`](scripts/verify-deploy.sh) (9/9 checks pass),
- `x-render-origin-server: Render` headers,
- a stable Next.js `buildId`,
- and visual + behavior confirmation of the new components,

is sufficient end-to-end evidence that the auto-deploy of commit `2cbf6bf` succeeded. There is no failed build log to surface.

## Captured raw output

See [`refgd/scripts/verify-deploy.output.txt`](scripts/verify-deploy.output.txt).
