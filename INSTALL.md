# OpenGame Studio — Полная инструкция по установке

> AI-фреймворк для создания браузерных игр из одного промпта.  
> Работает **полностью офлайн** — никаких облачных аккаунтов не нужно.

---

## Содержание

1. [Требования](#1-требования)
2. [Шаг 1 — Установить Docker](#2-шаг-1--установить-docker)
3. [Шаг 2 — Установить Git](#3-шаг-2--установить-git)
4. [Шаг 3 — Клонировать репозиторий](#4-шаг-3--клонировать-репозиторий)
5. [Шаг 4 — Настроить конфигурацию](#5-шаг-4--настроить-конфигурацию)
6. [Шаг 5 — Запустить](#6-шаг-5--запустить)
7. [Шаг 6 — Открыть интерфейс](#7-шаг-6--открыть-интерфейс)
8. [Скачать нативные приложения](#8-скачать-нативные-приложения)
9. [Установка на Android (PWA)](#9-установка-на-android-pwa)
10. [Управление сервисами](#10-управление-сервисами)
11. [Подключить AI провайдера](#11-подключить-ai-провайдера)
12. [Устранение неполадок](#12-устранение-неполадок)

---

## 1. Требования

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| ОС | Windows 10 / Ubuntu 20.04 / macOS 12 | Ubuntu 22.04 LTS |
| RAM | 8 ГБ | 16 ГБ |
| Диск | 15 ГБ свободно | 30 ГБ |
| CPU | 4 ядра | 8+ ядер |
| GPU | Не нужен | NVIDIA (ускоряет генерацию) |
| Интернет | Нужен только при первом запуске | — |

---

## 2. Шаг 1 — Установить Docker

Docker — единственная зависимость. Всё остальное запустится внутри контейнеров.

### Linux (Ubuntu / Debian / Mint)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version   # убедиться, что установился
```

### Windows

1. Скачать **Docker Desktop**: https://docs.docker.com/desktop/install/windows/
2. Установить — следовать мастеру установки
3. При запросе выбрать **WSL 2 backend** (рекомендуется)
4. Перезагрузить компьютер
5. Убедиться, что Docker Desktop запущен (иконка в трее)

### macOS

1. Скачать **Docker Desktop**: https://docs.docker.com/desktop/install/mac/
2. Перетащить в Applications
3. Запустить и дождаться надписи "Docker is running"

---

## 3. Шаг 2 — Установить Git

### Linux

```bash
sudo apt-get update && sudo apt-get install -y git
git --version
```

### Windows

Скачать и установить: https://git-scm.com/download/win  
Во время установки выбрать **"Git from the command line"**.

### macOS

```bash
xcode-select --install
# или через Homebrew:
brew install git
```

---

## 4. Шаг 3 — Клонировать репозиторий

Открыть терминал (на Windows — **Git Bash** или **PowerShell**):

```bash
git clone https://github.com/protasovvalera84-stack/game.git
cd game
```

Убедиться, что файлы на месте:

```bash
ls
# должны видеть: docker-compose.yml  Dockerfile.app  .env.docker  web-ui/  ...
```

---

## 5. Шаг 4 — Настроить конфигурацию

```bash
# Скопировать шаблон настроек
cp .env.docker .env
```

Открыть файл `.env` любым редактором и настроить при необходимости:

```bash
# Linux / macOS
nano .env

# Windows
notepad .env
```

Содержимое `.env` и что можно менять:

```dotenv
# ─── Порт веб-интерфейса ─────────────────────────────────────────
# По умолчанию 4000. Если порт занят — поменяйте, например на 8080
APP_PORT=4000

# ─── Языковая модель (скачается автоматически) ───────────────────
# Выберите один вариант в зависимости от RAM:
OPENGAME_MODEL=qwen2.5-coder:7b    # 8 ГБ RAM,  ~4 ГБ диск  ← по умолчанию
# OPENGAME_MODEL=qwen2.5-coder:14b # 16 ГБ RAM, ~8 ГБ диск  (лучше качество)
# OPENGAME_MODEL=qwen2.5-coder:32b # 32 ГБ RAM, ~20 ГБ диск (максимум)

# ─── Генерация изображений (необязательно) ───────────────────────
# Оставьте пустым — игры будут создаваться без AI-спрайтов (работает быстрее)
# Заполните если хотите AI-изображения:
OPENGAME_IMAGE_PROVIDER=
OPENGAME_IMAGE_API_KEY=
OPENGAME_IMAGE_MODEL=
```

> **Минимальная настройка** — просто скопировать `.env.docker` в `.env`  
> и ничего не менять. Всё будет работать по умолчанию.

---

## 6. Шаг 5 — Запустить

```bash
docker compose up -d --build
```

Эта команда:
- Собирает Docker-образы (~5–10 мин, только первый раз)
- Запускает Ollama — локальный AI на вашем компьютере
- Скачивает языковую модель (~4 ГБ, только первый раз)
- Собирает нативные установщики (.exe, .AppImage, .deb)
- Запускает веб-интерфейс на порту 4000

### Следить за прогрессом

```bash
# Все логи
docker compose logs -f

# Только загрузка модели (подождите — первый раз ~10-30 мин)
docker compose logs -f ollama-pull

# Статус всех сервисов
docker compose ps
```

Когда модель загружена, вы увидите в логах:
```
opengame-ollama-pull  | [pull] Done.
```

### Проверить, что всё работает

```bash
curl http://localhost:4000/api/health
# Ответ: {"status":"ok","version":"0.6.0"}
```

---

## 7. Шаг 6 — Открыть интерфейс

Откройте браузер и перейдите по адресу:

```
http://localhost:4000
```

Если устанавливали на **удалённый сервер**, замените `localhost` на IP:

```
http://ВАШ_IP:4000
# Например: http://192.168.1.100:4000
```

### Первые шаги в интерфейсе

1. Нажать **"New Game"** в правом верхнем углу
2. Написать промпт на любом языке, например:
   ```
   Создай платформер с двойным прыжком, монетами и финальным боссом
   ```
3. Нажать **"Generate"** и подождать 2–5 минут
4. Нажать **"Play Now"** — игра откроется в браузере

---

## 8. Скачать нативные приложения

После первого запуска сервер **автоматически соберёт** установщики для вашей ОС.

Перейдите в интерфейсе: **"Download"** (верхняя навигация)

Или скачайте напрямую:

| Платформа | Файл | Что делать |
|-----------|------|------------|
| Windows | `OpenGame-Studio-0.6.0-Setup.exe` | Запустить → Next → Install |
| Linux (любой) | `OpenGame-Studio-0.6.0.AppImage` | `chmod +x *.AppImage && ./OpenGame-Studio*.AppImage` |
| Linux (Debian/Ubuntu) | `opengame-studio_0.6.0_amd64.deb` | `sudo dpkg -i opengame-studio*.deb` |

> Установщики собираются автоматически в фоне. Если кнопка Download показывает  
> "Building installers..." — подождите 5–10 минут и обновите страницу.

### Сборка установщиков вручную (если нужно)

```bash
# Пересобрать
docker compose run --rm installer-builder

# Посмотреть что собралось
ls ~/.opengame/installers/
```

---

## 9. Установка на Android (PWA)

Веб-приложение устанавливается на Android как нативное — без App Store.

1. Открыть **Chrome** на телефоне
2. Перейти на `http://ВАШ_IP:4000`
3. Нажать на **⋮** (три точки) → **"Добавить на главный экран"**
4. Нажать **"Добавить"**

Приложение появится на домашнем экране как обычное приложение.  
Работает офлайн после первого посещения.

**iOS (iPhone / iPad):**
1. Открыть в **Safari**
2. Нажать **Поделиться** → **"На экран "Домой""**

---

## 10. Управление сервисами

```bash
# Остановить (данные сохраняются)
docker compose down

# Запустить снова (быстро, модель уже скачана)
docker compose up -d

# Обновить до последней версии
git pull
docker compose up -d --build

# Полная переустановка (удаляет все данные и игры!)
docker compose down -v
docker compose up -d --build

# Посмотреть использование CPU/RAM
docker stats

# Пересобрать только один сервис
docker compose up -d --build opengame
```

---

## 11. Подключить AI провайдера

По умолчанию используется **Ollama** — локальная модель, которая работает без интернета.

Для использования облачных провайдеров:

1. Перейти в **Settings** (иконка ⚙️ в навигации)
2. Выбрать провайдера из списка
3. Ввести API ключ
4. Нажать **"Test connection"**
5. Нажать **"Save settings"**

### Поддерживаемые провайдеры

| Провайдер | Бесплатно | Ключ |
|-----------|-----------|------|
| **Ollama** (локально) | ✅ Полностью | Не нужен |
| **Groq** | ✅ Free tier | https://console.groq.com |
| **Google Gemini** | ✅ Free tier | https://aistudio.google.com |
| **DeepSeek** | $5 кредиты | https://platform.deepseek.com |
| **OpenRouter** | Много бесплатных | https://openrouter.ai |
| **OpenAI** | Платный | https://platform.openai.com |
| **Anthropic Claude** | Платный | Через OpenRouter |
| **Mistral / Codestral** | Free preview | https://console.mistral.ai |
| **LM Studio** (локально) | ✅ Полностью | Не нужен |

---

## 12. Устранение неполадок

### Порт 4000 занят

```bash
# Изменить порт в .env
APP_PORT=8080
docker compose up -d
# Открыть: http://localhost:8080
```

### Модель скачивается слишком долго

```bash
# Посмотреть прогресс
docker compose logs -f ollama-pull

# Использовать меньшую модель — изменить в .env:
OPENGAME_MODEL=qwen2.5-coder:7b
docker compose up -d
```

### "Cannot connect to Docker daemon"

```bash
# Linux — добавить пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Windows — убедиться, что Docker Desktop запущен
```

### Не хватает памяти

```bash
# Использовать модель меньшего размера — изменить в .env:
OPENGAME_MODEL=qwen2.5-coder:7b   # минимальные требования
```

### Установщики не собираются

```bash
# Пересобрать вручную
docker compose run --rm installer-builder

# Посмотреть логи сборки
docker compose logs installer-builder
```

### Полный сброс

```bash
docker compose down -v          # удалить всё включая данные
docker system prune -f          # очистить кэш Docker
docker compose up -d --build    # начать заново
```

---

## Структура файлов

```
game/
├── docker-compose.yml     ← главный файл оркестрации
├── Dockerfile.app         ← образ веб-сервера + UI
├── Dockerfile.builder     ← образ сборщика установщиков
├── .env.docker            ← шаблон настроек (скопировать в .env)
├── .env                   ← ваши настройки (создать из .env.docker)
├── web-ui/                ← React интерфейс
├── packages/server/       ← Express + Socket.io бэкенд
├── electron/              ← Electron десктоп-приложение
└── scripts/
    ├── install.sh         ← одна команда для Linux/macOS
    ├── install.ps1        ← одна команда для Windows
    └── build-installers.sh← сборка .exe/.AppImage/.deb
```

---

## Одна команда — быстрый старт

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/protasovvalera84-stack/game/main/scripts/install.sh | bash
```

### Windows (PowerShell от администратора)

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/protasovvalera84-stack/game/main/scripts/install.ps1 | iex
```

---

*Если что-то не работает — откройте Issue на GitHub или обратитесь в поддержку.*
