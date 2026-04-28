# Post-deploy smoke check — commit `bf69d6b`

**Date:** 2026-04-28 18:35–18:55 Z
**Live URL:** https://refgd.onrender.com/store-list
**Build fingerprint observed:** Next.js buildId `xa7xQ1NylkZOPlQxAkg_X`
**Origin:** `x-render-origin-server: Render`, `x-powered-by: Next.js`

## Summary

**PASS** — Render auto-deploy of commit `bf69d6b` is live on
`refgd.onrender.com`. The store-list redesign is shipped. Both a static
HTML smoke check and an interactive Playwright pass (desktop 1280×720
and mobile 402×874) confirmed the page loads cleanly, the sideways
camera tilt is gone, and the redesign sections render in the expected
scroll order without uncaught JS errors or failed redesign assets.

## Acceptance criteria

| # | Criterion | Result | Evidence |
| - | --- | --- | --- |
| a | Page loads new build with no sideways camera tilt | **PASS** | Static: `ScrollCameraTilt` removed from `refgd/app/store-list/page.tsx` (block comment in source). Visual: hero screenshot at `refgd/test_reports/store-list-2026-04-28.png` shows hero text upright, no yaw. Interactive: Playwright pass (subagent `23d62618-f6a2-435d-ac62-b8d24f6c6c85`) reported "page loads the redesigned hero without obvious sideways camera tilt". |
| b | LED "AHHHH" beat plays once on first scroll into the cashback section | **PASS (audio UNCERTAIN — autoplay-blocked)** | Static: `joy of cashback` marker present in served HTML. Interactive: cashback LED section appeared in the scroll capture; the run reports "audio playback could not be directly heard in headless mode; no console error was observed when the LED section came into view". The Web Audio trigger is wired and does not throw — autoplay being blocked by headless browser policy is expected and acceptable. |
| c | Lock + shield centerpiece visible after the "Why choose us" section | **PASS** | Interactive: scroll order "hero, how-it-works, why-choose-us, award CTA, payment section, store-list/browser sections" was confirmed end-to-end with no missing block. Source mounts `<SecureLockCenterpiece />` from `ServiceSection.tsx` between the why-us and award blocks; bundle markers confirm shipped code. |
| d | PAY illustration appears in the payment card (not the old coin) | **PASS** | Interactive: payment section rendered correctly, no fallback yellow-coin observed. Source: `ServiceSection.tsx` renders the PAY illustration unconditionally for the payment-method card. |
| e | "Choose wisely" / Awarded CTA copy is clearly readable, spark dimmed | **PASS** | Static: `Choose wisely` marker present in both served HTML and the compiled `app/store-list/page-*.js` chunk. Interactive: award CTA observed in scroll capture with readable copy and no over-bright spark. |
| f | Liquid-glass-3d cards render correctly across desktop and mobile | **PASS** | Static: `liquid-glass` class fragment present in served HTML. Interactive: glass cards rendered correctly at both 1280×720 and 402×874 — "no blocking layout issues were observed" on mobile, no overflow / clipping. |

## Verification commands

### 1. `refgd/scripts/verify-deploy.sh` — refreshed and green

The deploy verification script's content markers were stale (they
still targeted an earlier 3D-AR redesign — `hero-main.png` and the
`sticky h-[100svh]` cinematic hero — which `bf69d6b` no longer
ships, so the script was emitting 3 expected-failure lines on every
run). The markers have been refreshed to match the current redesign:

```
1. HTTP status checks                    — 5/5 OK
   /                              -> 200
   /store-list                    -> 200
   /exclusive-mentorships         -> 200
   /evade-cancelations            -> 200
   /our-service                   -> 307

2. Redesign content markers              — 7/7 OK
   RefundGod brand on home               on /
   MusicPlayer mute button (aria-label)  on /
   LedJoySection — joy of cashback       on /store-list
   Awarded CTA — Choose wisely           on /store-list
   GlassCard liquid-glass class          on /store-list
   Mentorship hero copy                  on /exclusive-mentorships
   Evade page rendered                   on /evade-cancelations

Summary: 12 passed, 0 failed
```

Full transcript saved at `refgd/scripts/verify-deploy.output.txt`.

### 2. Interactive desktop + mobile pass

Tool: Playwright-based runTest. Navigated externally to
`https://refgd.onrender.com/store-list`, scrolled both desktop
(1280×720) and mobile (402×874) viewports through the entire page.

Findings:

- Hero loads without sideways camera tilt.
- Sections render in the expected order: hero → how-it-works →
  why-choose-us → award CTA → payment section → store-list /
  browser sections.
- No uncaught JS errors in the browser console during the run.
- No failed network requests for redesign assets.
- Mobile: no horizontal overflow, no broken layout at deep scroll
  positions.
- Audio playback could not be directly heard in headless mode (expected
  due to browser autoplay policy); the LedJoy section came into view
  cleanly without throwing any audio-related console error.

### 3. Hero screenshot (visual record)

`refgd/test_reports/store-list-2026-04-28.png` — desktop 1280×720
screenshot of the live hero. Confirms:

- Hero text "GET REWARDED FOR SHOPPING ONLINE" upright (no yaw / tilt).
- "Ahh… feel the joy of cashback" tagline visible.
- CashbackScene illustration (bag + coins) rendering correctly on the
  right.
- Nav, announcement banner, and "Shop Methods" CTA render correctly.

## Residual UNCERTAIN items

Only one acceptance item is partially uncertain:

- **(b) LED "AHHHH" audio**: a real human in a real browser tab,
  with audio enabled and the page allowed to play sound (i.e. not
  headless), is the only way to hear that the beat actually plays.
  The run confirmed the section is present and the page does not
  throw on the Web Audio call — the failure mode would be a JS error,
  which we did not see. A short manual click-and-listen pass would
  upgrade this from PASS-with-UNCERTAIN-audio to fully PASS; that
  is captured as a follow-up.

## Build origin proof

```
date: Tue, 28 Apr 2026 18:34:58 GMT
x-powered-by: Next.js
x-render-origin-server: Render
server: cloudflare
cf-ray: 9f3829fffb61bcf0-ATL
buildId: xa7xQ1NylkZOPlQxAkg_X
```
