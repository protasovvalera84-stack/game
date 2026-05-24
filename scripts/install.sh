#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenGame Studio — Linux / macOS one-line installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/leigest519/OpenGame/main/scripts/install.sh | bash
#
# What it does:
#   1. Checks for Docker + Docker Compose
#   2. Clones (or updates) the OpenGame repo
#   3. Copies .env.docker → .env if no .env exists
#   4. Runs docker compose up -d
#   5. Waits for the app and prints the URL
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_URL="https://github.com/leigest519/OpenGame.git"
INSTALL_DIR="${OPENGAME_DIR:-$HOME/.opengame/studio}"
GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

info()  { echo -e "${CYAN}[opengame]${NC} $*"; }
ok()    { echo -e "${GREEN}[opengame]${NC} $*"; }
error() { echo -e "${RED}[opengame] ERROR:${NC} $*" >&2; exit 1; }

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
check_cmd() {
  command -v "$1" &>/dev/null || error "$1 not found. Please install it first."
}

check_cmd docker
check_cmd git

# Docker Compose v2 (plugin) or v1 standalone
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  error "Docker Compose not found. Install it: https://docs.docker.com/compose/install/"
fi

info "Using: $COMPOSE_CMD"

# ── 2. Clone / update ─────────────────────────────────────────────────────────
if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Updating existing installation at $INSTALL_DIR …"
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Cloning OpenGame into $INSTALL_DIR …"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── 3. Create .env from template ──────────────────────────────────────────────
if [[ ! -f .env ]]; then
  cp .env.docker .env
  info "Created .env from template. Edit it to change the model or ports."
fi

# ── 4. Build & start ──────────────────────────────────────────────────────────
info "Building images and starting services …"
$COMPOSE_CMD up -d --build

# ── 5. Wait for health ────────────────────────────────────────────────────────
PORT="$(grep -E '^APP_PORT=' .env | cut -d= -f2)"
PORT="${PORT:-4000}"
info "Waiting for OpenGame to be ready (this may take a minute on first run) …"

for i in $(seq 1 60); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [[ $i -eq 60 ]]; then
    error "Service did not start in time. Check logs: $COMPOSE_CMD logs -f opengame"
  fi
done

echo ""
ok "────────────────────────────────────────────────────────"
ok " OpenGame Studio is running!"
ok " Open in your browser: http://localhost:${PORT}"
ok ""
ok " To stop:    cd $INSTALL_DIR && $COMPOSE_CMD down"
ok " To update:  cd $INSTALL_DIR && git pull && $COMPOSE_CMD up -d --build"
ok "────────────────────────────────────────────────────────"
