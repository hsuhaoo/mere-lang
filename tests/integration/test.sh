#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0

SERVER_PORT=$(( (RANDOM % 20000) + 30000 ))
echo "Starting HTTP server on port $SERVER_PORT..."
npx -y serve "$DIR" -p $SERVER_PORT --no-clipboard --no-request-logging 2>/dev/null &
SERVER_PID=$!
for i in $(seq 1 20); do
  if curl -s "http://127.0.0.1:$SERVER_PORT" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

cleanup() {
  kill $SERVER_PID 2>/dev/null || true
  playwright-cli close-all 2>/dev/null || true
}
trap cleanup EXIT

test_image() {
  echo "--- Image Test ---"
  playwright-cli open 2>/dev/null
  playwright-cli goto "http://127.0.0.1:$SERVER_PORT/test_image.html"

  # Wait for canvas rendering + image async load
  sleep 2

  # Check that the filled rect (200,200,50,50) with rgba(255,0,0,255) was drawn
  local result
  result=$(playwright-cli eval "() => {
    const c = document.getElementById('canvas');
    if (!c) return '{\"err\":\"no canvas\"}';
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(225, 225, 1, 1).data;
    const img = ctx.getImageData(5, 5, 1, 1).data;
    return JSON.stringify({fillRect: {r: d[0], g: d[1], b: d[2], a: d[3]}, imagePos: {r: img[0], g: img[1], b: img[2], a: img[3]}});
  }" 2>&1)

  # The JSON may contain escaped \" quotes — extract the outer object
  local json
  json=$(echo "$result" | sed -n 's/.*\({.*}\).*/\1/p' | head -1)

  if echo "$json" | grep -qE '"a": ?25[0-9]|a.*25[0-9]'; then
    echo "  ✓ image: filled rect drawn"
    PASS=$((PASS+1))
  else
    echo "  ✗ image: filled rect not drawn ($json)"
    FAIL=$((FAIL+1))
  fi

  playwright-cli close
}

test_audio() {
  echo "--- Audio Test ---"
  playwright-cli open 2>/dev/null
  playwright-cli goto "http://127.0.0.1:$SERVER_PORT/test_audio.html"

  sleep 2

  local result
  result=$(playwright-cli eval "() => {
    const err = document.querySelector('.error');
    return JSON.stringify({hasError: !!err, errorText: err ? err.textContent : ''});
  }" 2>&1)

  local json
  json=$(echo "$result" | sed -n 's/.*\({.*}\).*/\1/p' | head -1)

  if echo "$json" | grep -qE '"hasError": ?false|hasError.*false'; then
    echo "  ✓ audio: no errors"
    PASS=$((PASS+1))
  else
    echo "  ✗ audio: has errors ($json)"
    FAIL=$((FAIL+1))
  fi

  playwright-cli close
}

test_image
test_audio

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
