# PRD — RefundGod (refgd) Site

## Original Problem Statement
Render deployments / changes were not reflecting on the live site at https://refgd.onrender.com/, even when rolling back super far in Render. The user wanted a clean rollback to commit `09b9c48` to actually become visible on the live site.

## Architecture
- **Stack:** Next.js 14 App Router, deployed via Render (`rootDir: refgd` in `render.yaml`).
- **Repo:** https://github.com/tyhordhg70-code/refgd
- **Live URL:** https://refgd.onrender.com/
- **Single source of truth:** `/refgd/` subdirectory (the only directory Render builds).

## Root Cause Identified (this session)
Two parallel Next.js codebases existed:
- `/app` and `/components` at repo root (NOT used by Render).
- `/refgd/app` and `/refgd/components` (Render's `rootDir`, the only thing actually deployed).

The user kept editing the **root copy**, but Render only ever built `/refgd/`. Every change at the root was a silent no-op for the live site, and Render rollbacks could not undo polish changes that lived in the wrong folder.

A previous fork attempted to "fix" this by porting polish-state files from root INTO `/refgd/` (commit `37754de`), which silently undid the user's `0aa62c0` rollback and caused the live site to keep serving the polish version.

## Fix Applied (2026-05-02)
1. **Reverted commit `37754de`** so `/refgd/` matches `09b9c48` exactly. The intended rollback now actually deploys.
2. **Deleted the duplicate root `/app` and `/components`** directories so future edits can only happen in `/refgd/`.
3. **Removed the temporary `refgd_deploy_fix.patch`** artifact created during the previous fork's manual port.
4. **Pushed commit `92f38d1`** to `origin/main`. Render auto-deployed.

## Verified Live (2026-05-02)
- Render rebuilt: home-page chunk hash changed from `page-6e20c65dc74bfbb7.js` → `page-653ced3efe6ef82e.js`.
- HTML payload dropped from ~206 KB → ~189 KB (polish DOM removed).
- Polish-only classes (`hb-orb`, `hb-aurora`, `hb-star`) returned 0 matches in live HTML — confirming polish layers are gone.
- Screenshot of https://refgd.onrender.com/ shows the 09b9c48 baseline: simple WELCOME headline + 3D wireframe shapes, no DOM cinematic layer.

## Implemented (this session)
- 2026-05-02: Reverted incorrect refgd/ port (37754de) so live site actually shows 09b9c48 rollback.
- 2026-05-02: Removed duplicate root-level `/app` and `/components` directories.
- 2026-05-02: Removed leftover `refgd_deploy_fix.patch` from previous session.
- 2026-05-02: Verified Render redeployed and rollback content is live.

## Backlog

### P0
- None.

### P1
- User to **revoke the GitHub Personal Access Token** (`ghu_4JPtgg…`) that was pasted in chat last session. Go to https://github.com/settings/tokens.

### P2
- If user wants the LoadingScreen-stuck-at-95% bug fixed without restoring the rest of the polish chain, cherry-pick only commit `f535e8b` ("Make LoadingScreen dismiss in <=1.5s + skip on subsequent visits") onto current main.
- If user wants the lusion/nomoo lag-strategy home-page scroll feel back, cherry-pick `990467c`, `8487551`, `fe5eba0` onto current main (these only touch `refgd/components/CosmicJourney.tsx`).

## Critical Note for Future Edits
**ALL code edits MUST be made inside `/refgd/` only.** The root `/app` and `/components` folders no longer exist. `render.yaml` has `rootDir: refgd` so anything outside that subfolder is ignored by Render.
