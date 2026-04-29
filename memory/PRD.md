# PRD — Home Page Scroll/Animation Fix

## Original Problem Statement
Undo latest commit. After undo it fix the issues for mobile and PC on home page:
- Welcome animation should complete and finish in one scroll and immediately take users to Choose your path to mastery.
- Hard scrolling should not skip the entire animation.
- Fix the white overlay layer above “you have arrived”.
- Path to mastery cards should start with card 1 visible, not card 2.
- Card-to-card scroll animation should complete in one scroll.
- Card 5 should be viewable before the page scrolls down.

## Architecture Decisions
- Reverted the latest commit with a git revert commit before implementing new targeted fixes.
- Kept existing Next.js/Framer Motion homepage structure.
- Replaced fragile scroll-runway card behavior with a one-scroll locked stepper that works on mobile and desktop.
- Added a document-capture scroll/touch gate for the hero so hard wheel/swipe gestures are intercepted before native scrolling can skip sections.

## Implemented
- CosmicJourney now maps bright warp progress to the sticky runway and prevents the pale/white arrival overlay.
- One hard scroll from top/header lands at the paths section instead of skipping to Telegram/footer.
- Scrolling up near paths returns toward the welcome scene smoothly.
- Path cards now start on card 1 and advance exactly one card per wheel/vertical swipe.
- Card 5 “BUY 4 YOU” is reachable and visible before normal page scroll resumes.
- Added key `data-testid` hooks for path cards and controls.

## Verification
- `npx tsc --noEmit` passes.
- Self-tested mobile 390x800 and desktop 1920x800 hard-scroll from top/header.
- Self-tested card progression from card 1 through card 5.
- Testing agent initially found the top/header edge case; it was fixed and self-verified afterward.

## Backlog
### P0
- None remaining for the reported homepage scroll/card issue.

### P1
- Remove unrelated existing hydration warning in EditableText/HomeCTAButton flow.
- Add automated regression script for hero hard-scroll and path stepper.

### P2
- Tune visual pacing/spacing of the large desktop card stepper if the client wants a denser layout.
