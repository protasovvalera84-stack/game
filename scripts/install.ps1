# =============================================================================
# OpenGame Studio — установщик для Windows (PowerShell)
#
# Запуск одной командой (PowerShell от администратора):
#   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
#   irm https://raw.githubusercontent.com/protasovvalera84-stack/game/main/scripts/install.ps1 | iex
# =============================================================================

$ErrorActionPreference = "Stop"
$RepoUrl    = "https://github.com/protasovvalera84-stack/game.git"
$InstallDir = if ($env:OPENGAME_DIR) { $env:OPENGAME_DIR } else { "$env:USERPROFILE\opengame" }

function Write-Header { param($t) Write-Host "`n$t" -ForegroundColor White }
function Write-Info   { param($t) Write-Host "  > $t" -ForegroundColor Cyan }
function Write-Ok     { param($t) Write-Host "  [OK] $t" -ForegroundColor Green }
function Write-Warn   { param($t) Write-Host "  [!] $t" -ForegroundColor Yellow }
function Write-Err    { param($t) Write-Host "  [X] $t" -ForegroundColor Red; exit 1 }

# Баннер
Write-Host @"
  ╔══════════════════════════════════════╗
  ║        OpenGame Studio               ║
  ║  AI-генерация игр из одного промпта  ║
  ╚══════════════════════════════════════╝
"@ -ForegroundColor Cyan

# ── 1. Проверка зависимостей ──────────────────────────────────────────────────
Write-Header "1. Проверка зависимостей"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Err "Docker не найден. Скачайте: https://docs.docker.com/desktop/install/windows/"
}
Write-Ok "Docker найден"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Err "Git не найден. Скачайте: https://git-scm.com/download/win"
}
Write-Ok "Git найден"

$ComposeCmd = $null
try { docker compose version | Out-Null; $ComposeCmd = "docker compose" } catch { }
if (-not $ComposeCmd -and (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    $ComposeCmd = "docker-compose"
}
if (-not $ComposeCmd) {
    Write-Err "Docker Compose не найден. Обновите Docker Desktop."
}
Write-Ok "Docker Compose найден: $ComposeCmd"

try { docker info | Out-Null } catch {
    Write-Err "Docker не запущен. Запустите Docker Desktop и повторите."
}
Write-Ok "Docker запущен"

# ── 2. Клонировать / обновить ─────────────────────────────────────────────────
Write-Header "2. Установка файлов"

if (Test-Path "$InstallDir\.git") {
    Write-Info "Обновляю $InstallDir ..."
    git -C $InstallDir pull --ff-only
} else {
    Write-Info "Клонирую в $InstallDir ..."
    New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir) | Out-Null
    git clone --depth 1 $RepoUrl $InstallDir
}
Write-Ok "Файлы готовы"
Set-Location $InstallDir

# ── 3. API ключ ───────────────────────────────────────────────────────────────
Write-Header "3. Настройка AI провайдера"

Write-Host @"

  OpenGame Studio использует Groq — бесплатный AI провайдер.
  • Не нужна карта
  • Не нужно скачивать модели (4 ГБ)
  • Работает сразу

  Получить бесплатный ключ (2 минуты):
  1. Откройте https://console.groq.com
  2. Войдите через Google или GitHub
  3. API Keys → Create API key → скопируйте gsk_...

"@ -ForegroundColor White

# Проверить существующий ключ
$ExistingKey = ""
if (Test-Path ".env") {
    $ExistingKey = (Get-Content ".env" | Where-Object { $_ -match "^OPENAI_API_KEY=" }) -replace "^OPENAI_API_KEY=", ""
}

if ($ExistingKey -and $ExistingKey -ne "ВСТАВЬТЕ_GROQ_КЛЮЧ_СЮДА" -and $ExistingKey -ne "") {
    Write-Ok "API ключ уже настроен"
    $GroqKey = $ExistingKey
} else {
    do {
        $GroqKey = Read-Host "  Введите Groq API ключ (gsk_...)"
        if (-not $GroqKey) {
            $UseOllama = Read-Host "  Использовать локальный Ollama? [y/N]"
            if ($UseOllama -eq "y" -or $UseOllama -eq "Y") {
                $GroqKey = "ollama"
                break
            }
        }
    } while (-not ($GroqKey -match "^gsk_") -and $GroqKey -ne "ollama")
    Write-Ok "Ключ принят"
}

# ── 4. Создать .env ───────────────────────────────────────────────────────────
Write-Header "4. Создание конфигурации"

if ($GroqKey -eq "ollama") {
    @"
APP_PORT=4000
OPENAI_BASE_URL=http://ollama:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5-coder:7b
OPENGAME_MODEL=qwen2.5-coder:7b
OPENGAME_IMAGE_PROVIDER=
OPENGAME_IMAGE_API_KEY=
OPENGAME_IMAGE_MODEL=
"@ | Set-Content ".env" -Encoding UTF8
    Write-Warn "Ollama скачает ~4 ГБ модели при первом запуске"
} else {
    @"
APP_PORT=4000
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=$GroqKey
OPENAI_MODEL=llama-3.3-70b-versatile
OPENGAME_MODEL=qwen2.5-coder:7b
OPENGAME_IMAGE_PROVIDER=
OPENGAME_IMAGE_API_KEY=
OPENGAME_IMAGE_MODEL=
"@ | Set-Content ".env" -Encoding UTF8
}
Write-Ok ".env создан"

# ── 5. Запуск ─────────────────────────────────────────────────────────────────
Write-Header "5. Запуск (первый раз ~2-3 минуты)"

Write-Info "Собираю Docker образы..."
Invoke-Expression "$ComposeCmd up -d --build"

# ── 6. Ожидание ───────────────────────────────────────────────────────────────
Write-Header "6. Ожидание запуска"

$Port = 4000
$ready = $false
Write-Info "Жду пока сервис будет готов..."
for ($i = 1; $i -le 60; $i++) {
    Start-Sleep -Seconds 2
    Write-Host -NoNewline "."
    try {
        $r = Invoke-WebRequest "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}
Write-Host ""

if (-not $ready) {
    Write-Err "Сервис не запустился. Проверьте: $ComposeCmd logs -f opengame"
}

# ── 7. Готово ─────────────────────────────────────────────────────────────────
Write-Host @"

  ╔══════════════════════════════════════════════╗
  ║          OpenGame Studio готов!              ║
  ╠══════════════════════════════════════════════╣
  ║  Открыть: http://localhost:$Port                  ║
  ╠══════════════════════════════════════════════╣
  ║  New Game → введите промпт → Play Now        ║
  ╚══════════════════════════════════════════════╝

"@ -ForegroundColor Green

Start-Process "http://localhost:$Port"
