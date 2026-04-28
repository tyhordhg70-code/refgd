#!/usr/bin/env bash
set -u

BASE="${BASE:-https://refgd.onrender.com}"

pass=0
fail=0
failed_markers=()

record_fail() {
  fail=$((fail + 1))
  failed_markers+=("$1")
}

check_status() {
  local path="$1"
  local expected="$2"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE$path")
  if [ "$code" = "$expected" ]; then
    printf "  [OK]   %-40s %s (expected %s)\n" "$path" "$code" "$expected"
    pass=$((pass + 1))
  else
    printf "  [FAIL] %-40s %s (expected %s)\n" "$path" "$code" "$expected"
    record_fail "HTTP $expected on $path (got $code)"
  fi
}

check_contains() {
  local label="$1"
  local path="$2"
  local pattern="$3"
  local body
  body=$(curl -sS "$BASE$path")
  if echo "$body" | grep -qE "$pattern"; then
    printf "  [OK]   %-50s on %s (HTML)\n" "$label" "$path"
    pass=$((pass + 1))
  else
    printf "  [FAIL] %-50s on %s (HTML missing pattern /%s/)\n" "$label" "$path" "$pattern"
    record_fail "$label on $path (pattern /$pattern/ not in HTML)"
  fi
}

# check_in_html_or_chunks: probe for a marker that may live in the served HTML
# or in any of the Next.js JS chunks the page loads. Used for client-component
# strings that only appear inside the hydrated bundle (e.g. "AHHHH" from
# <LedJoySection>).
check_in_html_or_chunks() {
  local label="$1"
  local path="$2"
  local pattern="$3"
  local html
  html=$(curl -sS "$BASE$path")
  if echo "$html" | grep -qE "$pattern"; then
    printf "  [OK]   %-50s on %s (HTML)\n" "$label" "$path"
    pass=$((pass + 1))
    return
  fi
  local chunks
  chunks=$(echo "$html" | grep -oE '/_next/static/chunks/[^"'"'"']+\.js' | sort -u)
  if [ -z "$chunks" ]; then
    printf "  [FAIL] %-50s on %s (no JS chunks discovered in HTML)\n" "$label" "$path"
    record_fail "$label on $path (no JS chunks discovered)"
    return
  fi
  local hit_chunk=""
  for chunk in $chunks; do
    if curl -sS "$BASE$chunk" | grep -qE "$pattern"; then
      hit_chunk="$chunk"
      break
    fi
  done
  if [ -n "$hit_chunk" ]; then
    printf "  [OK]   %-50s on %s (chunk %s)\n" "$label" "$path" "$hit_chunk"
    pass=$((pass + 1))
  else
    printf "  [FAIL] %-50s on %s (pattern /%s/ not in HTML or in any of %d JS chunks)\n" \
      "$label" "$path" "$pattern" "$(echo "$chunks" | wc -l | tr -d ' ')"
    record_fail "$label on $path (pattern /$pattern/ not in HTML or any chunk)"
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
echo "2. Upload assets (must be 200 — these are how we know the redesign is shipped, not just present in source)"
check_status "/uploads/secure-lock.png"  "200"
check_status "/uploads/payment-pay.png"  "200"

echo
echo "3. Redesign content markers (unique to the redesign — not ambiguous taglines)"
check_contains          "RefundGod brand on home"                      "/"                       'RefundGod'
check_contains          "MusicPlayer mute button (aria-label)"         "/"                       'aria-label="Mute background music"'
check_in_html_or_chunks "LedJoySection — AHHHH beat marker"            "/store-list"             'AHHHH|aria-label="Ahhh, feel the joy of cashback"'
check_in_html_or_chunks "SecureLockCenterpiece — secure-lock asset"    "/store-list"             'secure-lock\.png'
check_in_html_or_chunks "Payment card — payment-pay asset"             "/store-list"             'payment-pay\.png'
check_contains          "Awarded CTA — Choose wisely"                  "/store-list"             'Choose wisely'
check_contains          "GlassCard liquid-glass class"                 "/store-list"             'liquid-glass'
check_contains          "Mentorship hero copy"                         "/exclusive-mentorships"  'Exclusive Mentorships'
check_contains          "Evade page rendered"                          "/evade-cancelations"     'Evade'

echo
echo "4. Render origin proof (response headers)"
curl -sS -D - -o /dev/null "$BASE/" | grep -iE '^(x-render-origin-server|x-powered-by|server|cf-ray|date):' | sed 's/^/  /'

echo
echo "5. Next.js build fingerprint (buildId — changes on every build)"
curl -sS "$BASE/" | grep -oE 'buildId\\":\\"[^\\]*' | sed 's/^/  /' | head -1

echo
echo "Summary: $pass passed, $fail failed"
if [ "$fail" -gt 0 ]; then
  echo
  echo "Failed markers:"
  for m in "${failed_markers[@]}"; do
    echo "  - $m"
  done
fi
exit "$fail"
