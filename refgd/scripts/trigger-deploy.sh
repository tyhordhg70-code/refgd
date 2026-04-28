#!/usr/bin/env bash
# Manually trigger a Render deploy for the refgd service.
#
# Why this exists:
#   The repo's only GitHub webhook (api.builder.io) does not subscribe to
#   push events, and there is no Render-installed webhook on the repo, so
#   pushes to main do not auto-trigger Render builds. Until that is fixed
#   in the Render dashboard, this script POSTs to a Render Deploy Hook
#   URL stored in the env var $RENDER_DEPLOY_HOOK to kick off a build.
#
# Usage:
#   RENDER_DEPLOY_HOOK="https://api.render.com/deploy/srv-xxx?key=yyy" \
#     ./refgd/scripts/trigger-deploy.sh
#
# Or set RENDER_DEPLOY_HOOK as a Repl secret and just run the script.

set -u

if [ -z "${RENDER_DEPLOY_HOOK:-}" ]; then
  echo "ERROR: RENDER_DEPLOY_HOOK env var is not set." >&2
  echo "Get the URL from the Render dashboard:" >&2
  echo "  refgd service → Settings → 'Deploy Hook' → copy the URL" >&2
  echo "Then store it as a Repl secret named RENDER_DEPLOY_HOOK." >&2
  exit 2
fi

echo "Triggering Render deploy for refgd..."
response=$(curl -sS -X POST -w "\nHTTP_STATUS:%{http_code}" "$RENDER_DEPLOY_HOOK")
status=$(echo "$response" | tail -1 | sed 's/HTTP_STATUS://')
body=$(echo "$response" | sed '$d')

echo "Status: $status"
echo "Response: $body"

if [ "$status" = "200" ] || [ "$status" = "201" ]; then
  echo "OK — Render accepted the deploy request."
  echo "Track progress at https://dashboard.render.com/web/<service-id>/events"
  exit 0
else
  echo "ERROR: Render did not accept the deploy request." >&2
  exit 1
fi
