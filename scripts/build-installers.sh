#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# build-installers.sh — builds Electron desktop installers and writes them
#                        to OUTPUT_DIR (default /data/installers).
#
# Called automatically by the `installer-builder` Docker service.
# Can also be run manually:
#   OUTPUT_DIR=/tmp/out bash scripts/build-installers.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/data/installers}"
LOCK_FILE="$OUTPUT_DIR/building.lock"
STAMP_FILE="$OUTPUT_DIR/build-complete.txt"
LOG_FILE="$OUTPUT_DIR/build.log"

mkdir -p "$OUTPUT_DIR"

# Only build once; remove STAMP_FILE to force a rebuild.
if [[ -f "$STAMP_FILE" ]]; then
  echo "[build] Installers already built ($(cat "$STAMP_FILE")). Skipping."
  echo "[build] Delete $STAMP_FILE to force a rebuild."
  exit 0
fi

# Create lock to signal "build in progress" to the frontend.
touch "$LOCK_FILE"
echo "[build] Starting installer build → $OUTPUT_DIR" | tee "$LOG_FILE"

cleanup() {
  rm -f "$LOCK_FILE"
}
trap cleanup EXIT

# ── 1. Install dependencies ───────────────────────────────────────────────────
echo "[build] Installing web-ui dependencies…" | tee -a "$LOG_FILE"
cd "$ROOT/web-ui"
npm ci --ignore-scripts 2>&1 | tee -a "$LOG_FILE"

echo "[build] Installing electron dependencies…" | tee -a "$LOG_FILE"
cd "$ROOT/electron"
npm ci --ignore-scripts 2>&1 | tee -a "$LOG_FILE"

# ── 2. Build web UI ───────────────────────────────────────────────────────────
echo "[build] Building web UI…" | tee -a "$LOG_FILE"
cd "$ROOT/web-ui"
npm run build 2>&1 | tee -a "$LOG_FILE"

# ── 3. Compile Electron TypeScript ───────────────────────────────────────────
echo "[build] Compiling Electron main process…" | tee -a "$LOG_FILE"
cd "$ROOT/electron"
npx tsc --project tsconfig.json 2>&1 | tee -a "$LOG_FILE"

# ── 4. Build installers ───────────────────────────────────────────────────────
cd "$ROOT/electron"

# Linux (always works natively on Linux)
echo "[build] Building Linux installers (AppImage + deb)…" | tee -a "$LOG_FILE"
npx electron-builder --linux AppImage deb \
  --config.directories.output="$OUTPUT_DIR" \
  2>&1 | tee -a "$LOG_FILE"

# Windows (requires Wine — skip gracefully if not available)
if command -v wine &>/dev/null; then
  echo "[build] Wine found — building Windows installer (.exe)…" | tee -a "$LOG_FILE"
  npx electron-builder --win nsis \
    --config.directories.output="$OUTPUT_DIR" \
    2>&1 | tee -a "$LOG_FILE"
else
  echo "[build] Wine not found — skipping Windows build." | tee -a "$LOG_FILE"
fi

# ── 5. Stamp success ──────────────────────────────────────────────────────────
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$STAMP_FILE"
echo "[build] Done! Installers written to $OUTPUT_DIR" | tee -a "$LOG_FILE"
ls -lh "$OUTPUT_DIR"/*.{AppImage,deb,exe} 2>/dev/null | tee -a "$LOG_FILE" || true
