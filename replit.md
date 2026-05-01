# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## RefundGod (`refgd/`) Imported Project

Self-hosted Next.js 15.5.15 app cloned from https://github.com/tyhordhg70-code/refgd.
Lives at `/home/runner/workspace/refgd/` (NOT under `artifacts/`); a thin wrapper
artifact at `artifacts/refgd-app/` proxies the dev server (port 18827) through
the artifact toml. Production deploys to Render — Replit production config in
the artifact toml is a static placeholder only. Installed standalone with
`--ignore-workspace`.

Local dev DB: PG unix socket on Replit doesn't speak SSL, so `refgd/lib/db.ts`
disables SSL when host is localhost/127.0.0.1/unix. Production SSL untouched.
`refgd/next.config.mjs` has `allowedDevOrigins` for *.replit.dev hosts.

### Bug/feature backlog (top-to-bottom)

- [x] **#1 — 3D planet/cosmos parallax (lusion.co / labs.nomooagency.com style)**
      Home scene in `refgd/workers/galaxy.worker.js`: planet/halo/flare now
      live under a `planetPivot` Group along with 3 orbiting moons (warm,
      violet, cyan-ice at distinct radii/periods/depths) and a tilted
      asteroid debris belt (130 desktop / 70 mobile points). Pivot drifts
      opposite cursor + has subtle yaw/pitch wobble + scroll-driven
      upward dolly. Moons are PARENTED to the pivot so they inherit its
      transforms (no double-parallax math). `GalaxyBackground.tsx` now
      remounts the canvas via `mountKey` if `transferControlToOffscreen`
      throws (StrictMode/HMR robustness fix from code review).
      **Pre-warm tactic (lusion / nomoo):** worker init now flips every
      scene visible, runs each scene's update at t=0, calls
      `renderer.compile(scene, camera)` to upload all WebGL programs to
      the GPU, renders one warmup frame, then restores visibility and
      posts `{type:"ready"}` back to the main thread. The
      `GalaxyBackground` listener relays it as a `refgd:scene-ready`
      window event, which the existing `LoadingScreen` already waits
      for. Net effect: cosmos animates *during* the loading screen
      (offscreen but warm), and the very first frame visible after the
      overlay fades is jank-free — no JIT shader compile, no first-paint
      stall on mobile GPUs.
- [ ] #2 — astronaut animation
- [ ] #3 — fix desktop lag (already heavily optimized via worker scenes;
      revisit if user reports still laggy)
- [ ] #4 — Android: scroll past pathcard 2
- [ ] #5 — iOS: pathcard illustrations vanishing
- [x] **#6 — distorted 3D mesh on Telegram box**
      `AnimatedTelegramBox.tsx` now overlays a lusion-style 3D mesh
      layer on desktop: perspective-warped grid floor (skewY warp +
      slow bg-position pan) and SVG wireframe sphere (7 lat ellipses
      + 12 meridians + vertex dots) with rotateZ spin + opacity pulse.
- [x] **#7 — varied animations on ALL boxcards**
      `GlassCard.tsx` now picks one of 6 lusion-style entrance variants
      (curtain / slide-l / slide-r / iris / tilt-3d / wipe-diag) per
      card via the `index` prop. All call sites (ServiceSection STEPS
      + WHY, evade FEATURES/PRICING/TRUST, storelist RULES + non-pay /
      payment) wired to pass `index={i}`. `viewport.once: true` so
      cards stay visible after scrolling past.
- [x] **#8 — bigger animated cashback illustration on mobile**
      `ServiceSection` bumped the mobile `CashbackScene` size 260→420
      and `CashbackScene` clamps to `min(${size}px, 92vw)` so the
      illustration fills the mobile viewport without ever overflowing
      horizontally (was visually small at 260px on narrow phones).
- [x] **#9 — shrink "joy of cashback"**
      `LedJoySection` min-h reduced (60svh→48svh / 40svh on mobile),
      AHHHH entrance more aggressive (x:520, scale:0.6, blur:8px).
- [x] **#10 — nomoolabs text animations on evade/storelist**
      Headings everywhere already use `KineticText` (per-word slide-up
      with blur, once:true). ChapterHeader uses KineticText too.
- [ ] #11 — fix blank sections after how-it-works/why-choose-us
- [ ] #12 — fix glow border artifacts
- [x] **#13 — fix blank section after storelist**
      Added outro CTA section "Don't see your store?" after StoreFilters
      with two MagneticButtons (Telegram + Submit Order).
- [x] **#14 — auto-scroll digital rain on evade (was: scroll-driven)**
      `PixelRainCosmic` now auto-ramps progress 0→1 over 700ms on
      viewport entry and drains on exit (no scroll listener). Evade
      page `scrollLength` reduced 1.8→0.6 since rain no longer needs
      scroll.
- [x] **#15 — fix evade page blank**
      Rewrote `AnimatedDivider`: shrunk 22vh→14vh, scrolling REFUNDGOD
      marquee, glowing centre rule, denser radial vignette, 16
      floaters split above/below. Plus all `GlassCard` viewport now
      `once: true` so revealed cards no longer re-clip themselves.
- [ ] #16 — fix mentorship card vanish on what's-included
- [ ] #17 — fix "stop watching start earning" text

Known minor: hydration mismatch warning in browser console (pre-existing,
investigate when its source surfaces).

## Integrations

- **GitHub** — connected via Replit OAuth connector. Helper at `artifacts/api-server/src/lib/github.ts`. Routes at `artifacts/api-server/src/routes/github.ts`.

## GitHub API Routes

- `GET /api/github/user` — authenticated user profile
- `GET /api/github/repos` — list repos (sorted by last updated)
- `GET /api/github/repos/:owner/:repo` — single repo details
- `GET /api/github/repos/:owner/:repo/issues` — open issues
- `GET /api/github/repos/:owner/:repo/pulls` — open pull requests
