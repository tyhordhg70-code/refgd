# PRD — Home Page Scroll/Animation Fix

## Original Problem Statement
Undo latest commit. After undo it fix the issues for mobile and PC on home page:
- Welcome animation should complete and finish in one scroll and immediately take users to Choose your path to mastery.
- Hard scrolling should not skip the entire animation.
- Fix the white overlay layer above “you have arrived”.
- Path to mastery cards should start with card 1 visible, not card 2.
- Card-to-card scroll animation should complete in one scroll.
- Card 5 should be viewable before the page scrolls down.

Follow-up report from user:
- Hard scrolling on the homepage still skipped the welcome animation.
- Scrolling could create a bottom overlay/boxed artifact.
- Scrolling back up from the bottom made animations/layout behave incorrectly.
- The five path cards should change only on vertical scrolling, not sideways scrolling.
- Hard downward scrolling must be strictly locked so unrevealed cards cannot be skipped.
- After the fifth card, normal vertical page scrolling must resume.

Latest desktop/mobile refinement request:
- Desktop should show all five path cards at once.
- Desktop should add a scroll-controlled cinematic 3D camera fly-by with diagonal zoom and sideways motion.
- Mobile should remain unchanged from the fixed one-card vertical scroll stepper.

## Architecture Decisions
- Reverted the latest commit with a git revert commit before implementing new targeted fixes.
- Kept existing Next.js/Framer Motion homepage structure.
- Replaced fragile scroll-runway card behavior with a one-scroll locked stepper that works on mobile and desktop.
- Added a document-capture scroll/touch gate for the hero so hard wheel/swipe gestures are intercepted before native scrolling can skip sections.
- Tightened the hero-to-paths handoff to recalculate its target live, preventing layout shifts from landing short or skipping past paths.
- Removed the upward hero auto-gate that could interfere when users scrolled back from the bottom of the page.
- Converted path cards from a sideways carousel motion into an in-place vertical-scroll card stepper.
- Split path-card behavior by breakpoint: desktop uses all-cards-visible camera fly-by; mobile keeps the locked one-card stepper.

## Implemented
- CosmicJourney now maps bright warp progress to the sticky runway and prevents the pale/white arrival overlay.
- One hard scroll from top/header lands at the paths section instead of skipping to Telegram/footer.
- Path cards start on card 1 and advance exactly one card per vertical wheel/swipe.
- Horizontal/sideways wheel input no longer changes cards.
- Card 5 “BUY 4 YOU” is reachable and the next down-scroll resumes normal page scroll.
- Returning above the paths section resets the stepper to card 1 so repeat journeys do not restart on card 5.
- Added key `data-testid` hooks for path cards and controls.
- Removed the visible carousel frame/box around the card stepper to avoid the bottom overlay artifact.
- 2026-04-29: Added desktop-only all-five-cards layout with scroll-controlled diagonal zoom/sideways 3D camera fly-by.
- 2026-04-29: Preserved mobile one-card stepper behavior and scroll lock.
- 2026-04-29: Added graceful empty-store fallback for `/store-list` when preview/dev database env vars are absent, preventing the linked path card from opening a 500 page.
- 2026-04-29: Fixed FactoryIllustration SVG coordinate hydration mismatch by rounding generated gear coordinates.

## Verification
- `npx tsc --noEmit` passes.
- Self-tested mobile 390x800 and desktop 1920x800 hard-scroll from top/header.
- Self-tested card progression from card 1 through card 5.
- Testing agent initially found the top/header edge case; it was fixed and self-verified afterward.
- 2026-04-29: `npx tsc --noEmit` passes after strict scroll-lock fixes.
- 2026-04-29: Self-tested desktop and mobile hard-scroll flows, card 1→5 progression, post-card-5 vertical resume, and top reset.
- 2026-04-29: Testing agent iteration 2 passed requested frontend scroll regressions at 100%; no frontend bugs found.
- 2026-04-29: `npx tsc --noEmit` passes after desktop camera fly-by and route fallback changes.
- 2026-04-29: Self-tested desktop homepage: all five cards render, `paths-desktop-camera-flyby` appears, camera transform changes through scroll, and card 1 link reaches `/store-list` without a 500.
- 2026-04-29: Self-tested mobile homepage: desktop fly-by is hidden, `paths-scroll-stepper` remains active, and card 1 starts visible.
- 2026-04-29: Testing agent iteration 3 verified requested desktop/mobile animation behavior; reported `/store-list` 500 was fixed afterward and self-tested.
- 2026-04-29: Rechecked `/exclusive-mentorships` scroll logs after SVG fix; hydration error is gone, only browser WebGL performance warnings remain.

## Backlog
### P0
- None remaining for the reported homepage scroll/card issue or latest desktop fly-by request after iteration 3 + self-tests.

### P1
- Remove unrelated existing hydration warning in EditableText/HomeCTAButton flow.
- Add automated regression script for hero hard-scroll and path stepper.
- Add automated regression coverage for desktop camera fly-by and mobile stepper breakpoint split.

### P2
- Tune visual pacing/spacing of the large desktop card stepper if the client wants a denser layout.
