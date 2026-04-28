#!/usr/bin/env bash
set -u

BASE="${BASE:-https://refgd.onrender.com}"

pass=0
fail=0

check_status() {
  local path="$1"
  local expected="$2"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE$path")
  if [ "$code" = "$expected" ]; then
    printf "  [OK]   %-30s %s (expected %s)\n" "$path" "$code" "$expected"
    pass=$((pass + 1))
  else
    printf "  [FAIL] %-30s %s (expected %s)\n" "$path" "$code" "$expected"
    fail=$((fail + 1))
  fi
}

check_contains() {
  local label="$1"
  local path="$2"
  local pattern="$3"
  local body
  body=$(curl -sS "$BASE$path")
  if echo "$body" | grep -qE "$pattern"; then
    printf "  [OK]   %-50s on %s\n" "$label" "$path"
    pass=$((pass + 1))
  else
    printf "  [FAIL] %-50s on %s\n" "$label" "$path"
    fail=$((fail + 1))
  fi
}

echo "Render deploy verification — $BASE"
echo "Run at: $(date -u +'%Y-%m-%d %H:%M:%SZ')"
echo

echo "1. HTTP status checks"
check_status "/"                      "200"
check_status "/store-list"            "200"
check_status "/exclusive-mentorships" "200"
check_status "/evade-cancelations"    "200"
check_status "/our-service"           "307"

echo
echo "2. Redesign content markers"
check_contains "Hero3D full-bleed image (hero-main.png)"       "/" 'images/hero-main\.png'
check_contains "MusicPlayer mute button (aria-label)"          "/" 'aria-label="Mute background music"'
check_contains "Pinned cinematic hero (sticky h-[100svh])"     "/exclusive-mentorships" 'sticky top-0 h-\[100svh\] w-full overflow-hidden'
check_contains "Pinned cinematic hero (sticky h-[100svh])"     "/evade-cancelations"    'sticky top-0 h-\[100svh\] w-full overflow-hidden'

echo
echo "3. Render origin proof (response headers)"
curl -sS -D - -o /dev/null "$BASE/" | grep -iE '^(x-render-origin-server|x-powered-by|server|cf-ray|date):' | sed 's/^/  /'

echo
echo "4. Next.js build fingerprint (buildId — changes on every build)"
curl -sS "$BASE/" | grep -oE 'buildId\\":\\"[^\\]*' | sed 's/^/  /' | head -1

echo
echo "Summary: $pass passed, $fail failed"
exit "$fail"
