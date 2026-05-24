# ──────────────────────────────────────────────────────────────────────────────
# OpenGame Studio — Installer Builder Image
#
# Builds Electron desktop installers for Linux (.AppImage + .deb) and
# optionally Windows (.exe via Wine) when the container starts.
# Output → /data/installers (shared Docker volume).
#
# Idempotent: skips if /data/installers/build-complete.txt already exists.
# Force rebuild: docker compose run --rm installer-builder
# ──────────────────────────────────────────────────────────────────────────────

FROM node:20-slim

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    OUTPUT_DIR=/data/installers

# ── System dependencies for Electron + packaging ─────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      # Native module compilation
      python3 make g++ git curl \
      # AppImage / deb packaging tools
      rpm fakeroot dpkg \
      # Electron runtime libraries (needed for --no-sandbox builds)
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libpango-1.0-0 libcairo2 libasound2 \
      # ── Wine for Windows cross-compile (adds ~800 MB — uncomment to enable) ─
      # wine wine32 wine64 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# ── Install dependencies (layer-cached until package files change) ────────────
COPY web-ui/package.json    web-ui/package-lock.json    ./web-ui/
COPY electron/package.json  electron/package-lock.json  ./electron/

RUN cd web-ui   && npm ci --ignore-scripts
RUN cd electron && npm ci --ignore-scripts

# ── Copy source ───────────────────────────────────────────────────────────────
COPY web-ui/     ./web-ui/
COPY electron/   ./electron/
COPY scripts/build-installers.sh ./scripts/

CMD ["bash", "scripts/build-installers.sh"]
