# ─────────────────────────────────────────────────────────────────────────────
# OpenGame Studio — Windows PowerShell installer
#
# Run in an elevated PowerShell terminal:
#   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
#   irm https://raw.githubusercontent.com/leigest519/OpenGame/main/scripts/install.ps1 | iex
#
# Requires: Docker Desktop for Windows (with WSL2 backend)
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

$RepoUrl    = "https://github.com/leigest519/OpenGame.git"
$InstallDir = if ($env:OPENGAME_DIR) { $env:OPENGAME_DIR } else { "$env:USERPROFILE\.opengame\studio" }
$AppPort    = 4000

function Write-Info  { param($msg) Write-Host "[opengame] $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[opengame] $msg" -ForegroundColor Green }
function Write-Err   { param($msg) Write-Host "[opengame] ERROR: $msg" -ForegroundColor Red; exit 1 }

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
Write-Info "Checking prerequisites…"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Err "Docker not found. Install Docker Desktop: https://docs.docker.com/desktop/windows/"
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Err "Git not found. Install from: https://git-scm.com/download/win"
}

# Prefer 'docker compose' (v2 plugin) over 'docker-compose' (v1 standalone)
$ComposeCmd = $null
try   { docker compose version | Out-Null; $ComposeCmd = "docker compose" }
catch { }
if (-not $ComposeCmd) {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $ComposeCmd = "docker-compose"
    } else {
        Write-Err "Docker Compose not found. Update Docker Desktop or install the plugin."
    }
}
Write-Info "Using: $ComposeCmd"

# ── 2. Clone / update ─────────────────────────────────────────────────────────
if (Test-Path "$InstallDir\.git") {
    Write-Info "Updating existing installation at $InstallDir …"
    git -C $InstallDir pull --ff-only
} else {
    Write-Info "Cloning OpenGame into $InstallDir …"
    New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir) | Out-Null
    git clone --depth 1 $RepoUrl $InstallDir
}

Set-Location $InstallDir

# ── 3. Create .env from template ──────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Copy-Item ".env.docker" ".env"
    Write-Info "Created .env from template. Edit it to change the model or ports."
}

# ── 4. Build & start ──────────────────────────────────────────────────────────
Write-Info "Building images and starting services…"
Invoke-Expression "$ComposeCmd up -d --build"

# ── 5. Wait for health ────────────────────────────────────────────────────────
Write-Info "Waiting for OpenGame to be ready (first run pulls ~4 GB model)…"

$ready = $false
for ($i = 1; $i -le 90; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest "http://localhost:$AppPort/api/health" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}

if (-not $ready) {
    Write-Err "Service did not start in time. Check logs: $ComposeCmd logs -f opengame"
}

Write-Host ""
Write-Ok "────────────────────────────────────────────────────────"
Write-Ok " OpenGame Studio is running!"
Write-Ok " Open in your browser: http://localhost:$AppPort"
Write-Ok ""
Write-Ok " To stop:    cd $InstallDir; $ComposeCmd down"
Write-Ok " To update:  cd $InstallDir; git pull; $ComposeCmd up -d --build"
Write-Ok "────────────────────────────────────────────────────────"

# Open browser automatically
Start-Process "http://localhost:$AppPort"
