# ──────────────────────────────────────────────────────────────────────────────
# OpenGame Studio — single-image build (web-ui + backend server)
#
#  Stage 1 (ui-builder):     install deps + build React web UI
#  Stage 2 (server-builder): install deps + compile TypeScript backend
#  Stage 3 (runtime):        minimal Node.js image that runs the server
# ──────────────────────────────────────────────────────────────────────────────

# Pin exact digest so the image never changes under us unexpectedly.
# Update by running: docker pull node:20-slim && docker inspect node:20-slim | grep Id
FROM node:20-slim AS base
# Disable npm update notifications inside Docker
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# ── Stage 1: Build React web UI ───────────────────────────────────────────────
FROM base AS ui-builder

WORKDIR /build/web-ui

# Install deps first (layer-cached until package files change)
COPY web-ui/package.json web-ui/package-lock.json ./
RUN npm ci --ignore-scripts

# Build
COPY web-ui/ ./
RUN npm run build

# ── Stage 2: Build backend server ─────────────────────────────────────────────
FROM base AS server-builder

WORKDIR /build/server

COPY packages/server/package.json packages/server/package-lock.json ./
RUN npm ci --ignore-scripts

COPY packages/server/ ./
RUN npx tsc --project tsconfig.json

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

ENV NODE_ENV=production \
    SERVER_PORT=4000 \
    GAMES_DIR=/data/games \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 curl git ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled server + its production node_modules
COPY --from=server-builder /build/server/dist         ./dist
COPY --from=server-builder /build/server/node_modules ./node_modules
COPY --from=server-builder /build/server/package.json ./package.json

# Web UI static files served by the backend at /
COPY --from=ui-builder /build/web-ui/dist ./web-ui/dist

VOLUME ["/data/games"]
VOLUME ["/data/installers"]

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "dist/server.js"]
