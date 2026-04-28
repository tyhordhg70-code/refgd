# Refundgod / refgd — Product Requirements

## Original problem statement
Apply drag-and-drop to all pages, especially the `/store-list` page so admins can edit store cards and reorder them. Only admins should be able to edit store cards, categories, and reorder cards. Any text, image, or element on ANY page should be editable. Add a pencil icon to edit. Selecting "Other" for a category should reveal an input field to type a custom category. Database cleanup: fetch real canonical store data from `refundgod.io` (USA, CAD, EU, UK), merge notes correctly, drop hallucinated/fake stores. Optional follow-ups: drag-and-drop section reorder across all pages, Three.js bundle dedupe, ChipScroll mobile pin-distance trim.

Earlier (Feb 2026) work also covered: cosmic background polish, scroll-driven animation engine rewrite, exclusive-mentorships layout polish, mobile/tablet optimisation.

## App architecture
- **Next.js 14** App Router project at `/app/`.
- **Frontend-only** Next.js (no separate FastAPI). Persistence is **PostgreSQL** via `pg` from `lib/db.ts` using `DATABASE_URL` (`RENDER_DATABASE_URL` on production).
- **Cosmic UX**: `GalaxyBackground` (three.js point cloud) is mounted at the layout level. Pages may add their own `CosmicBackground` and `LiquidParticles` on top.
- **Inline edit system**: `EditableText` + `EditProvider` (`lib/edit-context.tsx`). Admin signs in at `/admin`, then any page they visit gets an `EditorToolbar` to toggle edit mode. Two layered editing surfaces:
  1. **Hand-tagged primitives** (`EditableText`, `EditableImage`) keyed by stable `editId`s in component props. Used heavily on `/exclusive-mentorships`.
  2. **`AutoEditWrapper`** at the root layout level — runtime DOM walker that decorates every text-bearing leaf element and `<img>` under the `<main>` with `contentEditable` + amber outline + click-to-edit popovers. Click-anywhere-to-edit coverage with zero per-element work.
- **`ReorderableContainer` / `ReorderableSection`** — admin-only top-level section drag-and-drop on every major page. Order persists as a JSON array in `content_blocks` under `_section_order_<pageId>` and is part of the normal Save/Discard cycle.
- **Per-store-card drag-and-drop** in `StoreFilters.tsx` — admins can drag any store card within its (region, category) bucket; new sortOrder is densely renumbered (10/20/30…) and POSTed to `/api/admin/stores/reorder`.
- **Custom categories** — `StoreEditDialog` lets admins type a free-form category name when "Other" is selected. New names are pre-registered with `POST /api/admin/categories` and persisted on the store row's `category` column.

## What's been implemented (Feb 2026)

### Apr 27 2026 — Verified continuity + MusicPlayer volume clamp
Re-test of the Apr-2026 cosmic-journey ↔ paths continuity work after a previous fork session ended without testing.

- **MusicPlayer volume clamp**: `fadeVolumeTo` in `/app/components/MusicPlayer.tsx` now clamps `a.volume = Math.max(0, Math.min(1, v))` so overlapping fades and floating-point drift can no longer compute a fractional negative value (was producing repeated `Failed to set the 'volume' property on 'HTMLMediaElement': out of range` console errors during scroll).
- **Verified by `testing_agent_v3_fork` (iteration_4.json) — 8/8 PASS**:
  1. Cosmic warp particles, planet, orbital rings, streaks visible in hero on both mobile (390×844) and desktop (1920×1080).
  2. Path-picker headline overlaps cosmic-warp tail — programmatic `paths-reveal.top < cosmic-journey.bottom` confirmed on mobile; visual confirms streaks bleeding through behind the headline. No "white overlay card", no page break.
  3. Exactly ONE "— you have arrived" kicker (above the H2). Old emergence kicker inside `CosmicJourney` is fully removed.
  4. Telegram CTA box on 390-wide viewport: kicker, headline and "Join Group Chat" button all visible without colliding with the orbital animation (4/5 aspect mobile, 16/6 desktop).
  5. White-overlay corner-pixel scan over 220 samples (5 points × ~22 scroll stops × 2 viewports) returned **0 hits**. Footer fades cleanly via the linear-gradient.
  6. Scroll DOWN and UP (programmatic 0 → bottom → 0 in 200px/300px steps): all `getBoundingClientRect` values stable, no NaN, no flicker.
  7. **0 console errors** over full scroll cycle on both viewports. Zero "volume" / "out of range" messages.
  8. `cosmic-journey`, `paths-reveal`, `chapter-cosmos`, `hero-scroll-indicator` test-ids all present.

### Apr 2026 — Cosmic-journey ↔ paths continuity + mobile flicker
Reported: scrolling broken on mobile, "white overlay" + visible page break between WELCOME warp and the path picker, duplicate "you have arrived" emergence text.

- **Removed the Layer 8 emergence text** ("— chapter 01" + "you have arrived") inside `CosmicJourney.tsx`. The path-picker headline below now serves as the arrival moment, so there's only one "you have arrived" on the screen at a time.
- **`home.paths.kicker` default + DB seed copy** flipped from `— chapter 01 / paths` → `— you have arrived` (lib/content.ts + page.tsx).
- **New `PathsReveal` client component** wraps the entire chapter-01 block (headline + 4 path cards) with a scroll-driven fly-in (translateY 220 → 0, scale 0.86 → 1, opacity 0 → 1) anchored to `["start end", "start start"]` so the reveal completes exactly as the cosmic warp resolves. Mobile drops the scale and tames the translate to 80px to avoid address-bar flicker.
- **Negative top-margin** on `<ReorderableSection sectionId="paths">` (`-mt-[28vh] sm:-mt-[36vh]`) physically pulls the chapter UP into the tail of the cosmic-journey section. The two acts now overlap on screen — no visible page break, no dark strip between them.
- **Killed the "white overlay" card** — removed the glass background, border, padding, and backdrop blur from `.paths-intro`. Headline now sits directly in the cosmos with text-shadow glows for legibility.
- **CosmicJourney runway tightened** from 220/260svh → 180/210svh. Tighter narrative arc, less mobile scroll runway = less opportunity for address-bar resize to land mid-animation.

(Earlier in this PRD: drag-to-reorder, inline editor, store database work, etc.)

### Earlier passes (carry-over from prior fork sessions)
- Animation engine rewrite (`TextReveal`, `ScrollImage`, `BounceList`, `ExplodeText`, `CubicParallax`, `CustomCursor`).
- Cosmic background polish (`CosmicBackground`, `LiquidParticles`, `GalaxyBackground` shader fix), `EmotionChips` with wandering neon glow.
- `/exclusive-mentorships` layout, copy and Spline scroll-rotation polish.
- `EditableText` integration on `/exclusive-mentorships`, bcrypt admin password fix.
- Mobile/tablet performance tier (particle counts halved on phones, cursor hidden on coarse pointers).
- Database scraped + re-seeded from canonical refundgod.io (USA + CAD + EU + UK).

### This session (Feb 2026 — fork after global wrappers)
- Postgres re-installed locally (`postgres-15-main`) and seeded from `data/stores.json` with **502 unique stores** (USA 254 / CAD 80 / EU 88 / UK 80).
- Deduped `data/stores.json` itself — file had 6 duplicate `id`s (e.g. `usa-blackanddecker`) inflating the count to 508. Now 502, matches DB.
- Fixed `StoreEditDialog` Props type — added missing `availableCategories?: string[]` and `onCategoryAdded?: () => void` so the dialog compiles cleanly.
- Wired `availableCategories` and `onCategoryAdded={refreshCategories}` from `StoreFilters` into the dialog so admin extras (e.g. "Toys") survive edits and refresh the chip filter immediately after save.
- **Edit-mode persistence across navigations** — `EditProvider` now hydrates the toggle from `localStorage` (`refgd:editMode`) on mount and writes through on every `setEditMode`. Logout clears the key. Admins no longer have to re-click Edit on every page.
- **Comprehensive `data-testid` coverage** for the testing agent and manual QA:
  - `editor-toolbar`, `editor-toolbar-enter`, `editor-toolbar-publish`, `editor-toolbar-discard`, `editor-toolbar-exit`
  - `store-card-{id}`, `store-card-edit-{id}`, `store-card-delete-{id}`, `store-card-drag-{id}`, `store-add-{category}`
  - `store-search`, `store-region-USA|CAD|EU|UK`
  - `reorder-handle-{sectionId}` (already in place for section reorder)
  - `store-category-select`, `store-custom-category-input` (already in place)
- Verified: Three.js dedupe is **not feasible** without forking `@splinetool/runtime` because Spline ships its own Three v149 inlined into its CJS bundle. Mitigation already in place: Spline is `React.lazy`-loaded only on `/exclusive-mentorships`, so other pages bear zero Spline cost.
- Verified: ChipScroll mobile pin-distance trim is in place (`globals.css` `.chipscroll-runway` 250vh desktop / 180vh ≤768px).

### Cinematic mobile + storytelling pass (Apr 2026)
- **`CosmicJourney`** (new master scene) replaces `Hero3D` + `CosmosWarp`. One sticky 260vh runway choreographs WELCOME → planet zoom → warp tunnel → emergence into chapter 01, all driven by a single scroll progress so the cosmic story extends from the very first scroll all the way into the path picker.
- **`LiquidGlassOrbs`** (new) — sparse, theme-coloured glass orbs with refractive rim/highlight. Replaces the dense `InteractiveParticles` cloud in the hero so the screen finally has room to breathe.
- **`ChapterCosmos`** — orbital/constellation accent that lives behind Chapter 01, continues the journey beat over the path-picker block.
- **Mobile flicker fixed**: `HomeBackground` and `ParallaxChapter` background parallax disabled on `(max-width: 768px)` so address-bar viewport resizes can no longer re-trigger percent-based transforms. `.orb` blur halved on mobile to cut GPU rasterisation cost.
- **Horizontal scroll lock**: `body` and `main` get `overflow-x: clip` so oversized illustrations (e.g. 620px telegram spark SVG) can never push the layout sideways on phones.
- **Seamless backgrounds**: paths section card switched to glass with backdrop-blur (was opaque dark gradient that read as a "white" card on top of the cosmos). Pulsating overlay opacities reduced to keep dark areas dark.
- **Footer stacking fix**: footer now `relative z-[2]` so it always paints above `GalaxyBackground` (was being covered by the WebGL field on long pages).
- **Telegram → footer gap**: `pb-32` on the telegram chapter trimmed to `pb-12 sm:pb-16`.
- **Path cards**: cinematic z-axis fly-in (`rotateX 18 → 0`, `scale 0.85 → 1`) so they emerge out of the warp into chapter 01.
### Mobile stability + galaxy vignette pass (Apr 27 2026)
- **GalaxyBackground vignette + edge fades**: WebGL canvas no longer reads as a hard-edged "rectangular cluster" against page content. Three soft layers (radial vignette, top fade, bottom fade) feather the cosmic field to ink-950 at every viewport edge. Eliminates the "white half-transparent box" the user reported above the footer.
- **GalaxyBackground geometry**: outer torus z-spread widened from ±1 → ±8 (cloud, not disc), inner+outer particle counts halved again (5k+7k mobile, 18k+26k desktop). Camera scroll-dive tamed (z=21 → 17 instead of → 13). Net result: no rectangular cluster at any scroll depth.
- **PathCard opacity**: solid dark base layer (`linear-gradient(180deg, rgba(18,16,30,0.55), rgba(8,8,16,0.78))`) added behind glass-strong, accent BG_TINT bumped to `30/15/55` (was `20/5/transparent`). Cards now read as solid cards instead of ghost outlines.
- **CosmicJourney mobile tame**: planet/ring/streak/core max scales reduced ~3-5× on mobile. Sticky scene gets `transform: translate3d(0,0,0)` + `contain: layout paint` to force its own compositor layer (kills the address-bar-resize jump). Streak count 32 → 14 on mobile.
- **LiquidGlassOrbs**: dropped `backdrop-filter` (single biggest cause of mobile scroll stutter — re-blurs everything beneath every frame). Visual identical at fraction of GPU cost.
- **`paths-intro` glass card**: `backdrop-filter: none` on mobile (same reason). `.glass-strong` also drops backdrop-filter on touch screens.
- **Telegram → footer seamless**: gradient div added below the Telegram CTA that fades the page bg into ink-900. No more bright cosmic strip between CTA box and footer.
- **Moons fix**: nested-element trick separates orbital rotation (`animation: spin` on outer wrapper) from radial offset (inline `top:-Nvmin` on inner). Stops the inline-transform-vs-keyframe conflict that broke moons on scroll-up.
- **iOS scroll**: `overscroll-behavior-y: none` on html/body to stop the mobile address-bar pan from interfering with scroll.


- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion.
- three.js for `GalaxyBackground`; `@splinetool/react-spline` for the `/exclusive-mentorships` Spline scene (lazy).
- PostgreSQL via `pg` (`lib/db.ts`). Local dev uses self-installed `postgres-15` cluster (`postgres://postgres:postgres@localhost:5432/refgd`).
- Bcrypt-hashed admin password in `.env`.

## Test credentials
See `/app/memory/test_credentials.md`.

## Pending / Backlog
- (P3) **Spline scene visual validation** at `https://prod.spline.design/t1cRPSuUYdk8wCF9/scene.splinecode` — doesn't load in headless Chromium during e2e; needs a real desktop browser smoke test post-deploy.
- (P3) **Three.js dedupe** — keep deferring until Spline upstream stops bundling its own Three. Bundle bloat is isolated to `/exclusive-mentorships` only.
- (P3) **Logo 404s** — Clearbit/DDG/Google favicon fallback chain still 404s for stores without a CDN logo. Low value to fix; the in-card initial fallback handles it visually.
- (P2) **Migrate `THREE.Clock` → `THREE.Timer`** in `GalaxyBackground` to silence the deprecation warning.
- (P2) **Auto-id stability** — `AutoEditWrapper` IDs include a short hash of element text, so editing then refreshing before publish can orphan the queued value. Switch to a structural-path hash (tagName chain + nth-of-type + section data id) when this becomes a real user pain point.
- (P3) **Image upload size** — image popover currently capped at 4 MB and stored as a data URL in `content_blocks`. Once we add a proper object-store integration, swap the data URL for a hosted URL.

## Test results
- iteration_1.json (prior session): 11/13 PASS, 2 FAIL → fixed.
- iteration_2.json (prior session): 3/3 PASS — 100% green.
- iteration_3.json (this session): All critical flows PASS (admin login, edit-mode toggle, AutoEditWrapper text + image decoration, ReorderableSection handles, store-card overlay, /api/admin/stores/reorder, /api/admin/categories, StoreEditDialog Other → custom-input). Medium issues from this report were FIXED in this commit (edit-mode persistence + data-testid coverage). Anonymous user verification re-run: 0 admin UI artefacts visible, 254 store cards render, search + region testids present.

## Deployment
Production target: Render. The user MUST press the **"Save to Github"** button in the Emergent chat input to trigger a Render redeploy — the agent cannot `git push` directly.
