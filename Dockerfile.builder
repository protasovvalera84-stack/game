# ──────────────────────────────────────────────────────────────────────────────
# OpenGame Studio — Installer Builder Image
#
# Builds Electron desktop installers for Linux (.AppImage + .deb) and
# optionally Windows (.exe via Wine) when the container starts.
#
# Built once by the `installer-builder` Docker service; output is written
# to the `installers` shared volume mounted at /data/installers.
# ──────────────────────────────────────────────────────────────────────────────

FROM node:20-slim

# ── System deps for Electron + Linux packaging ────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      # Electron build tools
      python3 make g++ git curl \
      # AppImage / deb packaging
      rpm fakeroot dpkg \
      # Electron sandbox requirements
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libpango-1.0-0 libcairo2 libasound2 \
      # ── Wine for optional Windows cross-compile ─────────────────────────────
      # Uncomment to enable .exe building (adds ~800 MB):
      # wine wine32 wine64 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy only what's needed for the build (avoid re-running npm install on code changes)
WORKDIR /build

# Package manifests first (layer-cache friendly)
COPY web-ui/package*.json          ./web-ui/
COPY electron/package*.json        ./electron/

# Install deps for both packages
RUN cd web-ui   && npm install --ignore-scripts
RUN cd electron && npm install --ignore-scripts

# Now copy source code
COPY web-ui/     ./web-ui/
COPY electron/   ./electron/

# Copy the build script
COPY scripts/build-installers.sh ./scripts/

ENV OUTPUT_DIR=/data/installers

# The entrypoint runs the build script every time the container starts.
# The script itself is idempotent (skips if build-complete.txt exists).
CMD ["bash", "scripts/build-installers.sh"]
