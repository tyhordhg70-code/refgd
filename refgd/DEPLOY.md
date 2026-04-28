# Deploying refgd

## How deployment is supposed to work

The `refgd` Next.js site is hosted on Render at https://refgd.onrender.com,
configured by `render.yaml` at the repo root. The repo is
`github.com/tyhordhg70-code/refgd`. When `autoDeploy: true` is set and
the linked GitHub repo is correctly connected, every push to `main`
should trigger a fresh Render build within ~1 minute.

## What's actually broken

`autoDeploy: true` is set in `render.yaml`, but pushes to `main` do **not**
currently trigger Render builds. Every redesign or hotfix that has shipped
recently required a manual click of "Deploy latest commit" in the Render
dashboard.

### Root cause

The `refgd` GitHub repo has exactly one webhook installed:

```
url:    https://api.builder.io/projects/github/webhook
events: check_run, issue_comment, pull_request, pull_request_review,
        pull_request_review_comment
```

That webhook does **not** subscribe to `push` events, and **there is no
Render-installed webhook on the repo at all**. Render's auto-deploy works
by GitHub POSTing to a webhook Render installs when you connect the repo
through Render's GitHub App. That webhook is missing here, which is why
Render is never notified about new commits.

(Verified via `GET /repos/tyhordhg70-code/refgd/hooks` with `GITHUB_PAT`
on 2026-04-28.)

## How to fix it (one-time, in the Render dashboard)

This requires a person with admin access to the Render dashboard — the
agent cannot do it from inside the Repl.

1. Open https://dashboard.render.com and select the `refgd` service.
2. Go to **Settings → Build & Deploy**.
3. Confirm the linked repo is `tyhordhg70-code/refgd` and the branch is
   `main`. If it shows the right repo but auto-deploy is stuck, click
   **"Disconnect repo"**, then reconnect by clicking **"Connect a
   repository"** and re-selecting `tyhordhg70-code/refgd` → `main`.
   Reconnecting causes the Render GitHub App to reinstall the webhook
   on the GitHub repo.
4. Confirm **Auto-Deploy** is set to **Yes**.
5. After reconnecting, verify the webhook landed on GitHub at
   https://github.com/tyhordhg70-code/refgd/settings/hooks — there should
   now be a second webhook pointing at `api.render.com` with `push` in
   its event list.
6. Push a small trigger commit (or click "Deploy latest commit" once)
   and confirm the next push to `main` produces a new build event in
   the Render dashboard within ~1 minute.

## Fallback while the webhook is broken

A Render **Deploy Hook** is a unique URL per service that triggers a build
when POSTed to. We use this as the manual fallback.

### Setup (one-time)

1. In the Render dashboard for the `refgd` service: **Settings → Deploy
   Hook** → click "Generate" if no hook exists, then copy the URL. It
   looks like `https://api.render.com/deploy/srv-XXXXXX?key=YYYYYY`.
2. Add the URL to this Repl as a secret named `RENDER_DEPLOY_HOOK`.

### Usage

After pushing changes to `main`, run:

```bash
./refgd/scripts/trigger-deploy.sh
```

This POSTs to `$RENDER_DEPLOY_HOOK` and Render starts a fresh build
immediately. The script exits non-zero on failure so it can be chained:

```bash
git push origin main && ./refgd/scripts/trigger-deploy.sh
```

You can verify the new build is actually live with:

```bash
./refgd/scripts/verify-deploy.sh
```

## Why this matters

Until the GitHub webhook is reconnected (the "one-time fix" above), every
push that does not also call the trigger script will appear to "not
deploy" — the source on `main` will be ahead of what
https://refgd.onrender.com is serving. This was the root cause of every
"the redesign isn't actually live" symptom we hit during tasks #6 and #8.
