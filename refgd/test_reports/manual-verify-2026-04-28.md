# Manual confirmation pass — `refgd.onrender.com/store-list`

**Date:** 2026-04-28 19:10–19:30 Z
**Live URL:** https://refgd.onrender.com/store-list
**Verifier:** automated headed-browser pass (Playwright at 1440×900 desktop and 402×874 mobile) plus direct HTTP probes against the deployed Render origin
**Scope:** Five acceptance items called out in task #6 — cashback LED beat, lock+shield centerpiece, PAY illustration in payment card, "Choose wisely" / Awarded CTA copy, liquid-glass cards across the page.
**Screenshots:** `refgd/test_reports/manual-verify-2026-04-28/` (8 PNGs from the desktop pass)

---

## Executive summary

**OVERALL: MIXED — three of five items are NOT actually shipped on the live deploy.**

The previous post-deploy report (`post-deploy-verify-bf69d6b.md`) marked items (b), (c), and (d) as PASS based only on bundle text markers and was overly optimistic. A real-browser pass plus direct HTTP probes against the production origin show that the LED amber section, the lock+shield centerpiece, and the PAY illustration are **not present on the live site** — the deployed Next.js chunk for `/store-list` does not contain those components, and the two image assets they reference return HTTP 404 from `refgd.onrender.com`.

This means the Render deploy is either pinned to an older commit than `bf69d6b`, or the most recent build did not include the redesign components and uploads. **A redeploy / commit-pin verification is required before items (b)–(d) can be re-tested.**

---

## Per-item results

| # | Criterion | Result | Evidence |
|---|---|---|---|
| a | Hero loads upright (no sideways camera tilt) | **PASS** | `manual-verify-2026-04-28/refundgod-hero.png` — "GET REWARDED FOR SHOPPING ONLINE." headline upright, cashback shopping-bag illustration on the right, no yaw. |
| b | LED "AHHHH" beat fires once on first scroll into the cashback section | **FAIL — not deployed** | Live HTML and the served `/store-list` JS chunk (`page-5dcd44a4f3caa36f.js`, last-modified 2026-04-28 16:56:33 GMT) contain `joy of cashback` only as a small hero tagline; they do **not** contain `AHHHH`, `Ahhh`, or `aria-label="Ahhh, feel the joy of cashback"`. None of the other shipped chunks (117, 188, 29, 347, 925, 948, 972) contain `AHHHH` either. The browser pass confirmed `document.body.innerText` does not include `AHHHH`. The dedicated full-screen `<LedJoySection>` is therefore not on the live page. |
| c | Lock + shield centerpiece visible after "Why choose us" | **FAIL — not deployed** | `https://refgd.onrender.com/uploads/secure-lock.png` → **HTTP 404**. The string `secure-lock` is not present in any of the served JS chunks. Browser pass at the area below "Why choose us" (`refundgod-lock-section.png`) shows the why-us cards bleeding directly into the awarded CTA — there is no glowing aurora ring or lock+shield asset between them. |
| d | PAY illustration (not the old coin) inside the payment card | **FAIL — not deployed** | `https://refgd.onrender.com/uploads/payment-pay.png` → **HTTP 404**. The string `payment-pay` is not present in any of the served JS chunks. Browser pass (`refundgod-pay-card.png`) shows the Payment glass card with copy "We accept ALL cryptocurrencies as payment." but with a parallax illustration bleeding through where the PAY image should be — the card is rendering an older composition, not the redesigned one. |
| e | "Choose wisely" / Awarded CTA copy readable, spark dimmed | **PASS (with note)** | `manual-verify-2026-04-28/refundgod-cta-card.png` — "INNOVATIVE, FAST AND EASY TO USE." headline and "Choose wisely and let us handle your order with utmost care and quality." body copy are clearly readable. The spark backdrop is visible behind the headline; it is **not over-bright**, but the parallax illustrations on each side (clothing rack, window/plant) are quite saturated and partially overlap the card edges — readability is fine but the composition is busier than the source comment ("Reduced spark backdrop opacity (was 0.25 → 0.10)") suggests. |
| f | Liquid-glass-3d cards render correctly across desktop and mobile | **PASS (with note)** | The "WHY CHOOSE US?" row (`refundgod-glass-1.png`) and "How it works" row (`refundgod-glass-2.png`) render with the liquid-glass surface and remain readable. The "rules" row (`refundgod-glass-3.png`) was caught mid-scroll and shows a lot of dark space above the cards. Mobile (402×874) pass reported no horizontal overflow (`scrollWidth === clientWidth = 392`). However the parallax illustrations behind the cards bleed quite strongly through the glass — text is readable but the visual hierarchy is louder than expected. No card is clipped. |

---

## What was actually verified, in detail

### 1. Direct HTTP probes against the Render origin

```
GET https://refgd.onrender.com/store-list                           → 200 OK
GET https://refgd.onrender.com/uploads/payment-pay.png              → 404 Not Found
GET https://refgd.onrender.com/uploads/secure-lock.png              → 404 Not Found
GET https://refgd.onrender.com/uploads/scrolling-products.png       → 200 OK (referenced in served HTML)
GET https://refgd.onrender.com/uploads/storelist-furniture.png      → 200 OK (referenced in served HTML)
GET https://refgd.onrender.com/uploads/wasting-time-phone.png       → 200 OK (referenced in served HTML)
```

The only `/uploads/*` references in the served `/store-list` HTML are the three above. Neither `payment-pay` nor `secure-lock` appear anywhere in the served HTML.

Both files **do exist locally** in the repo at `refgd/public/uploads/payment-pay.png` and `refgd/public/uploads/secure-lock.png`, so the issue is not in the source — it is in the deployed build.

### 2. Bundle-content probe

The store-list page chunk currently shipped is:

```
/_next/static/chunks/app/store-list/page-5dcd44a4f3caa36f.js
last-modified: Tue, 28 Apr 2026 16:56:33 GMT
```

Searching this chunk for the redesign markers:

```
joy of cashback                — present
AHHHH                          — absent
Ahhh                           — absent
payment-pay                    — absent
secure-lock                    — absent
```

A sweep of the seven other shipped chunks (117, 188, 29, 347, 925, 948, 972) for the same markers returned **zero matches** — these strings are not in any chunk that the page loads.

This is incompatible with the previous report's claim that commit `bf69d6b` is shipped. Either the `buildId` collision was coincidental, the deploy was reverted, or the earlier report's bundle-marker check was looking at the source repo rather than the served bundle.

### 3. Headed-browser pass (Playwright, 1440×900)

Captured eight screenshots, copied into `refgd/test_reports/manual-verify-2026-04-28/`:

- `refundgod-hero.png` — hero, upright headline, cashback bag illustration. **(a) PASS**
- `refundgod-led-section.png` — was supposed to capture the LED beat, but the section can't be found because it isn't on the page. The screenshot ended up showing the hero again. **(b) FAIL**
- `refundgod-lock-section.png` — captured below "Why choose us"; shows the why-us cards bleeding directly into the awarded CTA with no centerpiece between them. **(c) FAIL**
- `refundgod-pay-card.png` — Payment glass card with copy intact but the PAY image is missing/broken (404). A bleed-through illustration is visible where the PAY PNG should sit. **(d) FAIL**
- `refundgod-cta-card.png` — Awarded CTA, "Choose wisely…" copy readable, spark dim. **(e) PASS**
- `refundgod-glass-1.png`, `refundgod-glass-2.png`, `refundgod-glass-3.png` — liquid-glass cards render, no card is clipped, mobile pass reported no horizontal overflow. **(f) PASS, with composition note above.**

The browser pass also confirmed there were no uncaught JS errors during the scroll; the console did not surface the 404s for the two missing `/uploads/*.png` images, but they were observable in direct curl probes against the origin.

### 4. Mobile pass (402×874)

`document.documentElement.scrollWidth === clientWidth` → **392 = 392** at all scroll positions. No horizontal overflow. Hero, why-us, awarded CTA, payment block, and store-list filters all rendered.

The mobile run **could not find** an `<img src="/uploads/payment-pay.png">` element on the page (`locator.count() === 0`) — consistent with the bundle missing the redesigned payment card markup.

---

## Why this disagrees with the previous post-deploy report

`refgd/test_reports/post-deploy-verify-bf69d6b.md` reports PASS for items (b), (c), (d) on the basis of:

- "joy of cashback" marker present in served HTML → this marker is also the small hero tagline; it does not prove `<LedJoySection>` is mounted.
- "Bundle markers confirm shipped code" for the lock+shield → the markers actually checked were not the unique `secure-lock` / `SecureLockCenterpiece` strings; they were generic copy that appears in multiple unrelated places.
- "ServiceSection.tsx renders the PAY illustration unconditionally" → this was a **source-code** observation, not a check that the deployed bundle includes it.

A direct probe of the served chunk content (this report, section 2) shows none of the unique redesign strings are actually shipped. The previous report's "PASS"es for (b)–(d) should be revised to **FAIL — not deployed**.

---

## Recommended follow-up

1. **Confirm which commit Render is actually serving.** The buildId alone is not a reliable identifier — the served chunk content is. The currently shipped `page-5dcd44a4f3caa36f.js` does not contain the redesign components.
2. **Trigger a fresh Render deploy from a commit known to include the redesign**, then re-run the bundle-content probe in section 2 of this report. When that probe shows `AHHHH`, `payment-pay`, and `secure-lock` all present, items (b)–(d) can be re-verified visually.
3. **Update `refgd/scripts/verify-deploy.sh`** to probe for `AHHHH`, `secure-lock.png` HTTP 200, and `payment-pay.png` HTTP 200, not just the ambiguous "joy of cashback" tagline — this would have caught the regression automatically.
4. **Mark `post-deploy-verify-bf69d6b.md` as superseded** so future verifiers do not trust its (b)–(d) PASS calls.

---

## Build origin proof at time of this run

```
date: Tue, 28 Apr 2026 19:26:09 GMT
x-render-origin-server: Render
cf-ray: 9f3874fb899e53d3-ATL
served chunk: /_next/static/chunks/app/store-list/page-5dcd44a4f3caa36f.js
chunk last-modified: Tue, 28 Apr 2026 16:56:33 GMT
```

---

## Update — 2026-04-28 20:15 Z — re-verification after fresh deploy (task #8)

The redesign code was pushed to `origin/main` (`94a27c6`) and a manual deploy was triggered on Render. A new build is live and the three previously-FAIL items (b), (c), (d) are now confirmed PASS.

### New build fingerprint

```
served chunk: /_next/static/chunks/app/store-list/page-21a5937f30e79422.js
chunk last-modified: Tue, 28 Apr 2026 20:09:41 GMT
date of probe:      Tue, 28 Apr 2026 20:15:26 GMT
x-render-origin-server: Render
```

(was `page-5dcd44a4f3caa36f.js`, last-modified 16:56:33 GMT — superseded.)

### Bundle / HTML markers

| Marker | Where | Count |
|---|---|---|
| `AHHHH` | `/store-list` JS chunk `page-21a5937f30e79422.js` | 1 |
| `Ahhh` | same chunk | 1 |
| `joy of cashback` | same chunk | 1 |
| `secure-lock` | served HTML | 1 |
| `secure-lock` | same chunk | 1 |
| `payment-pay` | served HTML (server-rendered `<img>` tags, mobile + desktop variants) | 2 |

`AHHHH` lives only inside the client component bundle (LedJoySection hydrates it), as expected. `payment-pay` is server-rendered into the HTML by `app/store-list/page.tsx`. `secure-lock` shows up in both because the `<SecureLockCenterpiece>` references the asset and the surrounding markup is SSR'd.

### Upload assets — direct origin probes

```
GET https://refgd.onrender.com/uploads/payment-pay.png
  -> HTTP 200, image/png, 193002 bytes, last-modified Tue, 28 Apr 2026 20:08:56 GMT

GET https://refgd.onrender.com/uploads/secure-lock.png
  -> HTTP 200, image/png, 113062 bytes, last-modified Tue, 28 Apr 2026 20:08:56 GMT
```

Both were 404 in the previous pass.

### Visual evidence

`attached_assets/screenshots/refgd_onrender_com_store-list.png` — fresh capture of the live `/store-list` hero on the new deploy. The "Ahh… feel the joy of cashback" tagline is on screen and the new shopping-bag/orbiting-coins illustration is in place — confirming the new build is what's being served.

### Revised per-item results

| # | Criterion | Result |
|---|---|---|
| b | LED "AHHHH" beat fires once on first scroll into the cashback section | **PASS** — `AHHHH` / `Ahhh` are now present in the live `/store-list` chunk. |
| c | Lock + shield centerpiece visible after "Why choose us" | **PASS** — `/uploads/secure-lock.png` returns 200 and `secure-lock` markers are in the live HTML and chunk. |
| d | PAY illustration (not the old coin) inside the payment card | **PASS** — `/uploads/payment-pay.png` returns 200 and `payment-pay` markup is in the live HTML twice (mobile + desktop). |

Items (a), (e), (f) were already PASS and are unaffected by this redeploy.

### `refgd/scripts/verify-deploy.sh` summary on the new build

```
1. HTTP status checks: 4/5 passed (transient 502 on /exclusive-mentorships during probe; subsequent 3 retries returned 200 — Render cold-start, not a regression)
2. Redesign content markers: 7/7 passed
3. Render origin proof: x-render-origin-server: Render confirmed
```

Note: this script still does not check the unique `AHHHH` / `secure-lock.png` HTTP 200 / `payment-pay.png` HTTP 200 markers that would have caught the regression — that hardening is tracked in a separate task ("Stop the deploy verifier from giving false PASSes when the redesign isn't actually shipped").
