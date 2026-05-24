# ──────────────────────────────────────────────────────────────────────────────
# OpenGame Studio — single-image build (web-ui + backend server)
#
#  Stage 1: build the React web UI
#  Stage 2: build the Node.js backend server
#  Stage 3: runtime image that serves both (static + API on port 4000)
# ──────────────────────────────────────────────────────────────────────────────

# ── 1. Build web UI ────────────────────────────────────────────────────────────
FROM node:20-slim AS ui-builder

WORKDIR /build/web-ui
COPY web-ui/package*.json ./
RUN npm ci --ignore-scripts

COPY web-ui/ ./
RUN npm run build

# ── 2. Build backend server ────────────────────────────────────────────────────
FROM node:20-slim AS server-builder

WORKDIR /build/server
COPY packages/server/package*.json ./
RUN npm ci --ignore-scripts

COPY packages/server/ ./
RUN npx tsc --project tsconfig.json

# ── 3. Runtime ─────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

ARG APP_VERSION=0.6.0
ENV NODE_ENV=production \
    SERVER_PORT=4000 \
    GAMES_DIR=/data/games \
    NPM_CONFIG_PREFIX=/usr/local/share/npm-global \
    PATH="/usr/local/share/npm-global/bin:$PATH"

# Install runtime tools + opengame CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 curl git ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /usr/local/share/npm-global

# Copy built artefacts
WORKDIR /app

COPY --from=server-builder /build/server/dist         ./dist
COPY --from=server-builder /build/server/node_modules ./node_modules
COPY --from=server-builder /build/server/package.json ./package.json

# Web UI static files – served by the backend
COPY --from=ui-builder /build/web-ui/dist ./web-ui/dist

# Games data volume
VOLUME ["/data/games"]

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "dist/server.js"]
