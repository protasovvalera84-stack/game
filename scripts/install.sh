#!/usr/bin/env bash
# =============================================================================
# OpenGame Studio — установщик для Linux / macOS
#
# Запуск одной командой:
#   curl -fsSL https://raw.githubusercontent.com/protasovvalera84-stack/game/main/scripts/install.sh | bash
# =============================================================================

set -euo pipefail

REPO_URL="https://github.com/protasovvalera84-stack/game.git"
INSTALL_DIR="${OPENGAME_DIR:-$HOME/opengame}"

# ── Цвета ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}▶${NC} $*"; }
ok()      { echo -e "${GREEN}✔${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✖${NC}  $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}$*${NC}"; }

# ── Баннер ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║        OpenGame Studio               ║"
echo "  ║  AI-генерация игр из одного промпта  ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Проверка зависимостей ──────────────────────────────────────────────────
header "1. Проверка зависимостей"

check_cmd() {
  if command -v "$1" &>/dev/null; then
    ok "$1 найден"
  else
    error "$1 не найден. Установите: $2"
  fi
}

check_cmd docker  "https://docs.docker.com/engine/install/"
check_cmd git     "sudo apt-get install -y git"

# Docker Compose v2 (плагин) или v1 (отдельный бинарь)
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
  ok "Docker Compose v2 найден"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
  ok "Docker Compose v1 найден"
else
  error "Docker Compose не найден. Обновите Docker Desktop или установите плагин."
fi

# Проверить что Docker daemon запущен
if ! docker info &>/dev/null 2>&1; then
  error "Docker daemon не запущен. Запустите Docker и повторите."
fi

# ── 2. Зеркало Docker Hub (для серверов с ограниченным доступом) ──────────────
header "2. Настройка Docker"

DAEMON_JSON="/etc/docker/daemon.json"
if [[ ! -f "$DAEMON_JSON" ]] || ! grep -q "registry-mirrors" "$DAEMON_JSON" 2>/dev/null; then
  info "Добавляю зеркало Docker Hub (ускоряет скачивание образов)..."
  mkdir -p /etc/docker
  cat > "$DAEMON_JSON" << 'DAEMON'
{
  "registry-mirrors": [
    "https://dockerhub.timeweb.cloud",
    "https://mirror.gcr.io"
  ],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
DAEMON
  systemctl restart docker 2>/dev/null || true
  sleep 2
  ok "Зеркало настроено"
else
  ok "Зеркало уже настроено"
fi

# ── 3. Клонировать / обновить репозиторий ─────────────────────────────────────
header "3. Установка файлов"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Обновляю существующую установку в $INSTALL_DIR ..."
  git -C "$INSTALL_DIR" pull --ff-only
  ok "Обновлено"
else
  info "Клонирую репозиторий в $INSTALL_DIR ..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
  ok "Клонировано"
fi

cd "$INSTALL_DIR"

# ── 4. Получить Groq API ключ ─────────────────────────────────────────────────
header "4. Настройка AI провайдера"

echo ""
echo -e "  OpenGame Studio использует ${BOLD}Groq${NC} — бесплатный AI провайдер."
echo -e "  • Не нужна карта"
echo -e "  • Не нужно скачивать модели (4 ГБ)"
echo -e "  • Работает сразу после ввода ключа"
echo ""
echo -e "  ${CYAN}Получить бесплатный ключ (2 минуты):${NC}"
echo -e "  1. Откройте ${BOLD}https://console.groq.com${NC}"
echo -e "  2. Войдите через Google или GitHub"
echo -e "  3. API Keys → Create API key → скопируйте ${BOLD}gsk_...${NC}"
echo ""

# Проверить не задан ли уже ключ
EXISTING_KEY=""
if [[ -f .env ]]; then
  EXISTING_KEY=$(grep -E "^OPENAI_API_KEY=" .env | cut -d= -f2 | tr -d '"' | tr -d "'" || true)
fi

if [[ -n "$EXISTING_KEY" && "$EXISTING_KEY" != "ВСТАВЬТЕ_GROQ_КЛЮЧ_СЮДА" && "$EXISTING_KEY" != "" ]]; then
  ok "API ключ уже настроен в .env, пропускаю"
  GROQ_KEY="$EXISTING_KEY"
else
  # Спросить ключ
  while true; do
    echo -ne "  Введите Groq API ключ ${CYAN}(gsk_...)${NC}: "
    read -r GROQ_KEY </dev/tty

    if [[ -z "$GROQ_KEY" ]]; then
      warn "Ключ не введён."
      echo ""
      echo -ne "  Использовать локальный Ollama вместо Groq? [y/N]: "
      read -r USE_OLLAMA </dev/tty
      if [[ "$USE_OLLAMA" =~ ^[Yy]$ ]]; then
        GROQ_KEY="ollama"
        break
      fi
      continue
    fi

    if [[ "$GROQ_KEY" =~ ^gsk_ ]]; then
      ok "Ключ принят"
      break
    else
      warn "Ключ должен начинаться с gsk_. Попробуйте снова."
    fi
  done
fi

# ── 5. Создать .env ───────────────────────────────────────────────────────────
header "5. Создание конфигурации"

if [[ "$GROQ_KEY" == "ollama" ]]; then
  # Режим Ollama
  cat > .env << ENV
APP_PORT=4000
OPENAI_BASE_URL=http://ollama:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5-coder:7b
OPENGAME_MODEL=qwen2.5-coder:7b
OPENGAME_IMAGE_PROVIDER=
OPENGAME_IMAGE_API_KEY=
OPENGAME_IMAGE_MODEL=
ENV
  # Раскомментировать Ollama в docker-compose
  info "Режим Ollama: включаю Ollama сервисы в docker-compose.yml..."
  sed -i 's/^  # ollama:/  ollama:/' docker-compose.yml
  sed -i 's/^  # ollama-pull:/  ollama-pull:/' docker-compose.yml
  sed -i 's/^  # ollama-data:/  ollama-data:/' docker-compose.yml
  sed -i 's/^  #   /    /g' docker-compose.yml
  warn "Ollama скачает модель ~4 ГБ при первом запуске. Это займёт время."
else
  # Режим Groq
  cat > .env << ENV
APP_PORT=4000
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=${GROQ_KEY}
OPENAI_MODEL=llama-3.3-70b-versatile
OPENGAME_MODEL=qwen2.5-coder:7b
OPENGAME_IMAGE_PROVIDER=
OPENGAME_IMAGE_API_KEY=
OPENGAME_IMAGE_MODEL=
ENV
fi

ok ".env создан"

# ── 6. Сборка и запуск ────────────────────────────────────────────────────────
header "6. Запуск (первый раз ~2-3 минуты)"

info "Собираю Docker образы..."
$COMPOSE up -d --build

# ── 7. Ожидание готовности ────────────────────────────────────────────────────
header "7. Ожидание запуска"

PORT=$(grep -E "^APP_PORT=" .env | cut -d= -f2)
PORT="${PORT:-4000}"

info "Жду пока сервис будет готов..."
for i in $(seq 1 60); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  printf "."
  sleep 2
  if [[ $i -eq 60 ]]; then
    echo ""
    error "Сервис не запустился. Проверьте логи: $COMPOSE logs -f opengame"
  fi
done
echo ""

# ── 8. Готово ─────────────────────────────────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║          OpenGame Studio готов!              ║"
echo "  ╠══════════════════════════════════════════════╣"
printf "  ║  Локально:  http://localhost:%-16s║\n" "${PORT}"
printf "  ║  По сети:   http://%-26s║\n" "${IP}:${PORT}"
echo "  ╠══════════════════════════════════════════════╣"
echo "  ║  New Game → введите промпт → Play Now        ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Полезные команды:"
echo -e "  ${CYAN}$COMPOSE logs -f${NC}         — логи"
echo -e "  ${CYAN}$COMPOSE down${NC}             — остановить"
echo -e "  ${CYAN}cd $INSTALL_DIR && git pull && $COMPOSE up -d --build${NC} — обновить"
echo ""
