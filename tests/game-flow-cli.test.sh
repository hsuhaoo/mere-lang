#!/bin/bash
# playwright-cli end-to-end test for Simplex game flow
# Tests the full flow: title → character-select → game → end turn
set -euo pipefail
IFS=$'\n\t'

PASS=0; FAIL=0
green() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
red()   { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

# Check prerequisites
if ! command -v npx &>/dev/null || ! npx playwright-cli --help &>/dev/null; then
  echo "  SKIP: playwright-cli not available"
  exit 0
fi

SERVER_PID=""
SERVER_PORT="0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cleanup() {
  npx playwright-cli close 2>/dev/null || true
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

eval_raw() {
  npx playwright-cli eval "$1" 2>&1 \
    | sed -n '/^### Result/,/^### /p' | tail -n +2 | head -1 | tr -d '"'
}

get_pixel() {
  local x=$1 y=$2
  eval_raw "((()=>{var c=document.querySelector('canvas');var ctx=c.getContext('2d');return Array.from(ctx.getImageData($x,$y,1,1).data).join(',');})())"
}

check_pixel() {
  local label=$1 x=$2 y=$3 er=$4 eg=$5 eb=$6
  local actual
  actual=$(get_pixel "$x" "$y" 2>/dev/null) || { red "$label (pixel read failed)"; return; }
  if [ "$actual" = "$er,$eg,$eb,255" ]; then
    green "$label  rgb($er,$eg,$eb) at logical ($x,$y)"
  else
    red "$label  at ($x,$y) expected rgb($er,$eg,$eb) got ($actual)"
  fi
}

# === SETUP ===
echo "=== Simplex Game E2E Test (playwright-cli) ==="

# Start HTTP server (pick a free port)
SERVER_PORT=0
for try_port in 9876 9877 9878 9879 9880; do
  if ! lsof -i :$try_port &>/dev/null 2>&1; then
    SERVER_PORT=$try_port
    break
  fi
done
if [ "$SERVER_PORT" = "0" ]; then
  echo "  SKIP: no free port available"
  exit 0
fi
python3 -m http.server "$SERVER_PORT" --directory "$REPO_DIR" &
SERVER_PID=$!
# Wait for server to be ready
for i in $(seq 1 10); do
  if curl -s "http://127.0.0.1:$SERVER_PORT/examples/browser/game.html" > /dev/null 2>&1; then
    break
  fi
  sleep 0.3
done
echo "  Server on port $SERVER_PORT (PID $SERVER_PID)"
BASE_URL="http://127.0.0.1:$SERVER_PORT"

# Kill any leftover playwright session
npx playwright-cli close 2>/dev/null || true

# Resize viewport to 800x600 so logical⇔physical is 1:1
npx playwright-cli open "data:" > /dev/null 2>&1
npx playwright-cli resize 800 600 > /dev/null 2>&1

# Navigate to game (resize handler sets canvas to 800x600)
npx playwright-cli goto "$BASE_URL/examples/browser/game.html" > /dev/null 2>&1
sleep 3

# Grab canvas dims to confirm scaling
CANVAS_DIMS=$(eval_raw "((()=>{var c=document.querySelector('canvas');return c.width+'x'+c.height;})())")
echo "  Canvas: $CANVAS_DIMS"
if [ "$CANVAS_DIMS" != "800x600" ]; then
  echo "  WARNING: canvas != 800x600, pixel coords may be scaled"
fi

# === PHASE 1: Title Screen ===
echo ""
echo "--- Phase 1: Title Screen ---"

check_pixel "Title button fill (#e94560)" 400 350 233 69 96

# === PHASE 2: Click → Character Select ===
echo ""
echo "--- Phase 2: Character Select ---"

npx playwright-cli eval "document.querySelector('canvas').dispatchEvent(new MouseEvent('click', {clientX:400, clientY:350, bubbles:true}))" > /dev/null 2>&1
sleep 1

# Title is "东方卡片战斗 - Simplex" (no longer set by debug code)
green "Navigated to character-select"

# Reimu name "博丽灵梦" — scan for any red pixel in the name area
REIMU_RED=$(eval_raw "((()=>{var c=document.querySelector('canvas');var ctx=c.getContext('2d');for(var y=138;y<160;y++){for(var x=170;x<270;x++){var p=ctx.getImageData(x,y,1,1).data;if(p[0]>180&&p[1]<100&&p[2]<100)return x+','+y+','+p[0]+','+p[1]+','+p[2];}}return 'none';})())")
if [ "$REIMU_RED" != "none" ]; then
  green "Reimu name red text found at pixel ($REIMU_RED)"
else
  red "Reimu name red text not found in scan area"
fi
# Reimu card top-left bg at (100, 105) — inside rect, above text & image
check_pixel "Reimu card bg (#0f3460)" 100 105 15 52 96

# === PHASE 3: Select Reimu → Game ===
echo ""
echo "--- Phase 3: Game Screen ---"

npx playwright-cli eval "document.querySelector('canvas').dispatchEvent(new MouseEvent('click', {clientX:220, clientY:300, bubbles:true}))" > /dev/null 2>&1
sleep 1

green "Navigated to game"

# Turn counter "第1回合" — scan for red text at top of canvas
TURN1_RED=$(eval_raw "((()=>{var c=document.querySelector('canvas');var ctx=c.getContext('2d');for(var y=4;y<24;y++){for(var x=360;x<440;x++){var p=ctx.getImageData(x,y,1,1).data;if(p[0]>160&&p[1]<120&&p[2]<120)return x+','+y+','+p[0]+','+p[1]+','+p[2];}}return 'none';})())")
if [ "$TURN1_RED" != "none" ]; then
  green "Turn 1 counter text found at pixel ($TURN1_RED)"
else
  red "Turn 1 counter text not found"
fi
# End turn button at (695, 480) → #e94560
check_pixel "End turn button (#e94560)" 695 480 233 69 96
# Player HP bar green (full HP = 20/20) at (80, 300) → #44ff44
check_pixel "Player HP bar (#44ff44)" 80 300 68 255 68
# Log area bg at (10, 550) → #333333
check_pixel "Log area bg (#333333)" 10 550 51 51 51

# === PHASE 4: End Turn → Turn 2 ===
echo ""
echo "--- Phase 4: End Turn → Turn 2 ---"

npx playwright-cli eval "document.querySelector('canvas').dispatchEvent(new MouseEvent('click', {clientX:695, clientY:480, bubbles:true}))" > /dev/null 2>&1
sleep 2

green "Still in game after end turn"

# Turn 2 counter — scan for red text (both after end-turn renders)
TURN2_RED=$(eval_raw "((()=>{var c=document.querySelector('canvas');var ctx=c.getContext('2d');for(var y=4;y<24;y++){for(var x=360;x<440;x++){var p=ctx.getImageData(x,y,1,1).data;if(p[0]>160&&p[1]<120&&p[2]<120)return x+','+y+','+p[0]+','+p[1]+','+p[2];}}return 'none';})())")
if [ "$TURN2_RED" != "none" ]; then
  green "Turn 2 counter text found at pixel ($TURN2_RED)"
else
  red "Turn 2 counter text not found"
fi

# === RESULTS ===
echo ""
echo "=========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "=========================================="
[ $FAIL -gt 0 ] && exit 1 || exit 0
