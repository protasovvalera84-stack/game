# ──────────────────────────────────────────────────────────────────────────────
# OpenGame Studio — полная сборка
#
# Stage 1 (cli-builder):    сборка opengame CLI из исходников
# Stage 2 (ui-builder):     сборка React web-UI
# Stage 3 (server-builder): компиляция TypeScript backend-сервера
# Stage 4 (runtime):        итоговый минимальный образ
# ──────────────────────────────────────────────────────────────────────────────

# ── Общий базовый образ ────────────────────────────────────────────────────────
FROM node:20-slim AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# ── Stage 1: Сборка opengame CLI ──────────────────────────────────────────────
FROM base AS cli-builder

# Нужны нативные инструменты для некоторых npm-зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ git ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Настраиваем глобальный путь для npm
RUN mkdir -p /usr/local/share/npm-global
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global \
    PATH="/usr/local/share/npm-global/bin:$PATH"

WORKDIR /home/node/app
COPY . .

# HUSKY=0 — пропускаем git-хуки в Docker
# npm ci устанавливает зависимости всего монорепо
# build --workspaces компилирует packages/cli и packages/core
# npm pack создаёт .tgz которые потом устанавливаем глобально
RUN HUSKY=0 npm ci --ignore-scripts \
    && npm run build --workspaces --if-present \
    && npm pack -w @opengame/opengame      --pack-destination ./packages/cli/dist  \
    && npm pack -w @opengame/opengame-core --pack-destination ./packages/core/dist

# ── Stage 2: Сборка React web-UI ─────────────────────────────────────────────
FROM base AS ui-builder

WORKDIR /build/web-ui
COPY web-ui/package.json web-ui/package-lock.json ./
RUN npm ci --ignore-scripts

COPY web-ui/ ./
RUN npm run build

# ── Stage 3: Компиляция TypeScript backend-сервера ───────────────────────────
FROM base AS server-builder

WORKDIR /build/server
COPY packages/server/package.json packages/server/package-lock.json ./
RUN npm ci --ignore-scripts

COPY packages/server/ ./
RUN npx tsc --project tsconfig.json

# ── Stage 4: Runtime ──────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

ENV NODE_ENV=production \
    SERVER_PORT=4000 \
    GAMES_DIR=/data/games \
    WEB_UI_DIST=/app/web-ui/dist \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    # Глобальный путь для npm (opengame устанавливается сюда)
    NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH="/usr/local/share/npm-global/bin:$PATH"

# Системные зависимости runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 curl git ca-certificates \
      # Нужны opengame CLI для работы с файлами
      ripgrep jq \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/local/share/npm-global

# ── Устанавливаем opengame CLI глобально ──────────────────────────────────────
COPY --from=cli-builder /home/node/app/packages/cli/dist/*.tgz  /tmp/
COPY --from=cli-builder /home/node/app/packages/core/dist/*.tgz /tmp/
RUN npm install -g /tmp/*.tgz \
    && npm cache clean --force \
    && rm -f /tmp/*.tgz \
    && opengame --version 2>/dev/null || echo "[ok] opengame CLI installed"

# ── Копируем backend-сервер ───────────────────────────────────────────────────
WORKDIR /app
COPY --from=server-builder /build/server/dist         ./dist
COPY --from=server-builder /build/server/node_modules ./node_modules
COPY --from=server-builder /build/server/package.json ./package.json

# ── Копируем web-UI ───────────────────────────────────────────────────────────
COPY --from=ui-builder /build/web-ui/dist ./web-ui/dist

VOLUME ["/data/games"]
VOLUME ["/data/installers"]

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "dist/server.js"]
