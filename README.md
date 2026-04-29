# Enterprise Platform

A self-hosted company operations platform — chat, Kanban, HR directory, admin panel, dashboard, Outlook and Teams integration — deployed as a Docker Compose stack.

> **Русская версия** — [ниже](#enterprise-platform-ru) / **Russian version** — [below](#enterprise-platform-ru)

---

## Table of Contents

- [What's included](#whats-included)
- [Architecture](#architecture)
- [Developer Setup (Docker Desktop)](#developer-setup-docker-desktop)
  - [Prerequisites](#prerequisites)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Start infrastructure services](#2-start-infrastructure-services)
  - [3. Configure environment](#3-configure-environment)
  - [4. Install dependencies](#4-install-dependencies)
  - [5. Run database migrations and seed](#5-run-database-migrations-and-seed)
  - [6. Start dev servers](#6-start-dev-servers)
  - [7. First login and account sync](#7-first-login-and-account-sync)
- [Service URLs](#service-urls)
- [Useful commands](#useful-commands)
- [Optional: Microsoft Outlook & Teams](#optional-microsoft-outlook--teams)
- [Monorepo structure](#monorepo-structure)

---

## What's included

| Feature | Details |
|---|---|
| **Auth** | Keycloak 24 (OIDC/OAuth2), username + password, JWT validation |
| **Admin panel** | Manage organization, hierarchical departments, create users (synced to Keycloak) |
| **Chat** | Real-time messaging (text, voice, video, files), group and direct rooms |
| **Kanban** | Boards, drag-and-drop cards, subtasks, labels, assignees |
| **Dashboard** | Company news feed, assigned tasks, upcoming deadlines |
| **People** | Searchable user directory, profile pages, work history |
| **Departments** | Organisation chart |
| **Notifications** | Real-time push, deadline alerts |
| **Outlook** | Read inbox, view messages, send email (Microsoft Graph) |
| **Teams** | Browse channels and send messages (Microsoft Graph) |
| **File storage** | MinIO (S3-compatible, self-hosted) |

---

## Architecture

```
browser
  └── Next.js (port 3000)  ←→  NestJS API (port 3001)
                                    ├── PostgreSQL 16 (port 5433 in dev)
                                    ├── Redis 7 (port 6379)
                                    ├── Keycloak 24 (port 8080)
                                    └── MinIO (port 9000)
```

In development each service runs in Docker, the API and web servers run on the host with hot-reload.

---

## Developer Setup (Docker Desktop)

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | ≥ 4.x | Must be running before you start |
| [Node.js](https://nodejs.org/) | ≥ 20 | LTS recommended |
| [pnpm](https://pnpm.io/installation) | ≥ 9 | `npm install -g pnpm` |
| Git | any | |

> **Windows note:** All shell commands below work in **Git Bash** or **WSL 2**. PowerShell users: replace `cp` with `Copy-Item` and forward-slashes in paths with backslashes where needed.

---

### 1. Clone the repository

```bash
git clone <repo-url> enterprise
cd enterprise
```

---

### 2. Start infrastructure services

This starts PostgreSQL, Redis, Keycloak, and MinIO inside Docker:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

Wait ~30 seconds for Keycloak to finish importing the realm. You can check progress with:

```bash
docker compose -f infra/docker-compose.dev.yml logs -f keycloak
# Ready when you see: "Listening on: http://0.0.0.0:8080"
```

**Ports used on your host:**

| Service | Host port |
|---|---|
| PostgreSQL | 5433 |
| Redis | 6379 |
| Keycloak | 8080 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

> Port **5433** (not 5432) is intentional — it avoids conflicts with a locally-installed PostgreSQL.

---

### 3. Configure environment

```bash
cp .env.dev apps/api/.env
cp .env.dev apps/web/.env.local
```

The `.env.dev` file is pre-configured for local development. No changes needed to get started.

---

### 4. Install dependencies

```bash
pnpm install
pnpm --filter @enterprise/shared build
```

---

### 5. Run database migrations and seed

#### Linux / macOS

```bash
pnpm --filter api run db:migrate
pnpm --filter api run db:generate
pnpm --filter api run seed
```

#### Windows (Git Bash or PowerShell)

The Prisma schema-engine binary has a known connection issue with Docker-hosted PostgreSQL on Windows (SCRAM-SHA-256 auth). Run migrations via a Docker container instead:

**Step 1 — Apply migration:**
```bash
docker run --rm --network infra_default \
  -v "$(pwd)/apps/api:/workspace" \
  -e DATABASE_URL="postgresql://postgres:postgres@postgres:5432/enterprise" \
  node:20 bash -c \
  "cd /workspace && npm install -g prisma@5.22.0 2>/dev/null && prisma migrate dev --name init --skip-seed"
```

**Step 2 — Generate Prisma client on the host:**
```bash
pnpm --filter api run db:generate
```

**Step 3 — Seed the database:**
```bash
docker run --rm --network infra_default \
  -v "$(pwd)/apps/api/prisma:/prisma-work" \
  -e DATABASE_URL="postgresql://postgres:postgres@postgres:5432/enterprise" \
  -e SEED_ORG_SLUG=default \
  -e APP_NAME="Enterprise Dev" \
  -e SEED_ADMIN_EMAIL=admin@example.com \
  -e SEED_ADMIN_KEYCLOAK_SUB=bootstrap-admin \
  node:20 bash -c \
  "mkdir /s && cd /s && npm init -y >/dev/null && npm install prisma@5.22.0 @prisma/client@5.22.0 >/dev/null \
   && cp /prisma-work/schema.prisma . && npx prisma generate >/dev/null && cp /prisma-work/seed.js . && node seed.js"
```

The seed creates:
- A default organization
- A superadmin user (`admin@example.com`) with a placeholder Keycloak sub

---

### 6. Start dev servers

Open **three terminal windows**:

**Terminal 1 — Watch shared types** (recompiles on every change):
```bash
pnpm --filter @enterprise/shared build --watch
```

**Terminal 2 — NestJS API** (hot-reload on port 3001):
```bash
# First time only: clear stale build cache
rm -f apps/api/tsconfig.tsbuildinfo

pnpm --filter api dev
```

Wait for: `Nest application successfully started`

**Terminal 3 — Next.js web** (fast refresh on port 3000):
```bash
pnpm --filter web dev
```

Wait for: `Ready - started server on 0.0.0.0:3000`

Open **http://localhost:3000** in your browser.

---

### 7. First login and account sync

The seed creates the superadmin record with a placeholder ID (`bootstrap-admin`). After your first Keycloak login, you need to sync the real Keycloak UUID into the database.

**Step 1 — Create the Keycloak account for the superadmin**

1. Open **http://localhost:8080** → click **Administration Console** → log in with `admin` / `admin`
2. Switch to the **enterprise** realm (top-left dropdown)
3. Go to **Users → Add user**
   - Username: `admin@example.com`
   - Email: `admin@example.com`
   - First name: `Super`, Last name: `Admin`
   - Email verified: ON
4. Save, then open the **Credentials** tab → **Set password** → set `Admin1234!` (or any password), turn off "Temporary"
5. Open the **Role mapping** tab → **Assign role** → filter by realm → assign `superadmin`
6. Copy the user **ID** (UUID) from the URL or the **Details** tab (e.g. `0e4be01b-d0a5-4a8a-b0cd-8d4c487dd058`)

**Step 2 — Update the database record**

Run this from Git Bash (replace the UUID with yours):
```bash
docker exec -it $(docker ps -qf "name=postgres") \
  psql -U postgres -d enterprise \
  -c "UPDATE users SET id = '0e4be01b-d0a5-4a8a-b0cd-8d4c487dd058', keycloak_sub = '0e4be01b-d0a5-4a8a-b0cd-8d4c487dd058' WHERE email = 'admin@example.com';"
```

**Step 3 — Log in to the app**

Open **http://localhost:3000**, click **Sign in** — you will be redirected to Keycloak. Log in with `admin@example.com` and the password you set. You should land on the Dashboard.

> **Tip:** For any new users created after this point, use the **Admin panel** (⚙️ in the sidebar) — it creates the Keycloak account and the database record simultaneously, so this manual sync is only needed for the initial superadmin.

---

## Service URLs

| Service | URL | Credentials |
|---|---|---|
| **App** | http://localhost:3000 | `admin@example.com` / password you set |
| **API** | http://localhost:3001/api | — |
| **Keycloak console** | http://localhost:8080 | `admin` / `admin` |
| **MinIO console** | http://localhost:9001 | `minioadmin` / `minioadmin` |

---

## Useful commands

```bash
# Type-check without building
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit

# Open Prisma Studio — visual database browser
pnpm --filter api exec prisma studio

# Stop all Docker services
docker compose -f infra/docker-compose.dev.yml down

# Wipe all data and start fresh (WARNING: destroys the database)
docker compose -f infra/docker-compose.dev.yml down -v

# View logs of a specific service
docker compose -f infra/docker-compose.dev.yml logs -f keycloak
docker compose -f infra/docker-compose.dev.yml logs -f postgres

# Run E2E tests (app must be running on port 3000)
pnpm --filter web e2e
pnpm --filter web e2e:ui    # opens Playwright UI
```

---

## Optional: Microsoft Outlook & Teams

1. Register an app in [Azure Portal](https://portal.azure.com) → **App registrations → New registration**
2. Add a **Redirect URI**: `http://localhost:3001/api/oauth/microsoft/callback` (Web platform)
3. Under **Certificates & secrets**, create a client secret
4. Under **API permissions**, add:
   - `Mail.Read`, `Mail.Send` (Delegated) for Outlook
   - `ChannelMessage.Read.All`, `ChannelMessage.Send`, `Team.ReadBasic.All` (Delegated) for Teams
5. In `apps/api/.env` and `apps/web/.env.local`, set:

```env
MICROSOFT_CLIENT_ID=<Application (client) ID>
MICROSOFT_CLIENT_SECRET=<client secret value>
MICROSOFT_TENANT_ID=<Directory (tenant) ID>
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/oauth/microsoft/callback
MICROSOFT_ENCRYPTION_KEY=<32 random bytes in hex>
```

Generate the encryption key with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Monorepo structure

```
apps/
  api/                NestJS backend (port 3001)
  web/                Next.js 15 frontend (port 3000)
packages/
  shared/             Shared TypeScript types and Zod validators
infra/
  docker-compose.yml          Production stack
  docker-compose.dev.yml      Dev infrastructure (postgres, redis, keycloak, minio)
  keycloak/realm-export.json  Pre-configured enterprise realm
  minio/init-buckets.sh       Creates storage buckets on first start
docs/
  superpowers/
    specs/            Feature design documents
    plans/            Implementation plans
```

---
---

# Enterprise Platform (RU)

Самостоятельно размещаемая платформа для внутренних операций компании — чат, Kanban, HR-справочник, панель администратора, дашборд, интеграция с Outlook и Teams — разворачивается через Docker Compose.

> **English version** — [above](#enterprise-platform)

---

## Содержание

- [Что включено](#что-включено)
- [Архитектура](#архитектура)
- [Настройка для разработчика (Docker Desktop)](#настройка-для-разработчика-docker-desktop)
  - [Требования](#требования)
  - [1. Клонирование репозитория](#1-клонирование-репозитория)
  - [2. Запуск инфраструктурных сервисов](#2-запуск-инфраструктурных-сервисов)
  - [3. Настройка окружения](#3-настройка-окружения)
  - [4. Установка зависимостей](#4-установка-зависимостей)
  - [5. Миграции базы данных и сид](#5-миграции-базы-данных-и-сид)
  - [6. Запуск серверов разработки](#6-запуск-серверов-разработки)
  - [7. Первый вход и синхронизация аккаунта](#7-первый-вход-и-синхронизация-аккаунта)
- [Адреса сервисов](#адреса-сервисов)
- [Полезные команды](#полезные-команды)
- [Опционально: Outlook и Teams](#опционально-outlook-и-teams)
- [Структура монорепозитория](#структура-монорепозитория)

---

## Что включено

| Функция | Описание |
|---|---|
| **Авторизация** | Keycloak 24 (OIDC/OAuth2), вход по логину и паролю, валидация JWT |
| **Панель администратора** | Управление организацией, иерархией отделов, создание пользователей (синхронизируется с Keycloak) |
| **Чат** | Обмен сообщениями в реальном времени (текст, голос, видео, файлы), групповые и личные комнаты |
| **Kanban** | Доски, перетаскивание карточек, подзадачи, метки, исполнители |
| **Дашборд** | Новостная лента компании, назначенные задачи, ближайшие дедлайны |
| **Сотрудники** | Поиск по справочнику, страницы профилей, история работы |
| **Отделы** | Организационная структура |
| **Уведомления** | Push в реальном времени, оповещения о дедлайнах |
| **Outlook** | Просмотр входящих, чтение писем, отправка (Microsoft Graph) |
| **Teams** | Просмотр каналов и отправка сообщений (Microsoft Graph) |
| **Хранилище файлов** | MinIO (S3-совместимое, self-hosted) |

---

## Архитектура

```
браузер
  └── Next.js (порт 3000)  ←→  NestJS API (порт 3001)
                                    ├── PostgreSQL 16 (порт 5433 в dev)
                                    ├── Redis 7 (порт 6379)
                                    ├── Keycloak 24 (порт 8080)
                                    └── MinIO (порт 9000)
```

В режиме разработки все сервисы запускаются в Docker, а API и веб-сервер работают на хосте с горячей перезагрузкой.

---

## Настройка для разработчика (Docker Desktop)

### Требования

| Инструмент | Версия | Примечания |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | ≥ 4.x | Должен быть запущен до начала работы |
| [Node.js](https://nodejs.org/) | ≥ 20 | Рекомендуется LTS |
| [pnpm](https://pnpm.io/installation) | ≥ 9 | `npm install -g pnpm` |
| Git | любая | |

> **Для Windows:** все команды ниже выполняются в **Git Bash** или **WSL 2**. В PowerShell замените `cp` на `Copy-Item`, а косые черты в путях — на обратные.

---

### 1. Клонирование репозитория

```bash
git clone <url-репозитория> enterprise
cd enterprise
```

---

### 2. Запуск инфраструктурных сервисов

Команда запускает PostgreSQL, Redis, Keycloak и MinIO внутри Docker:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

Подождите ~30 секунд, пока Keycloak импортирует конфигурацию realm. Прогресс можно отследить:

```bash
docker compose -f infra/docker-compose.dev.yml logs -f keycloak
# Готово, когда увидите: "Listening on: http://0.0.0.0:8080"
```

**Порты на хосте:**

| Сервис | Порт |
|---|---|
| PostgreSQL | 5433 |
| Redis | 6379 |
| Keycloak | 8080 |
| MinIO API | 9000 |
| MinIO Console | 9001 |

> Порт **5433** (а не 5432) выбран специально — чтобы не конфликтовать с локально установленным PostgreSQL.

---

### 3. Настройка окружения

```bash
cp .env.dev apps/api/.env
cp .env.dev apps/web/.env.local
```

Файл `.env.dev` уже настроен для локальной разработки. Никаких изменений не требуется.

---

### 4. Установка зависимостей

```bash
pnpm install
pnpm --filter @enterprise/shared build
```

---

### 5. Миграции базы данных и сид

#### Linux / macOS

```bash
pnpm --filter api run db:migrate
pnpm --filter api run db:generate
pnpm --filter api run seed
```

#### Windows (Git Bash или PowerShell)

На Windows у Prisma есть известная проблема с подключением к PostgreSQL в Docker (аутентификация SCRAM-SHA-256). Запустите миграции внутри Docker-контейнера:

**Шаг 1 — Применить миграцию:**
```bash
docker run --rm --network infra_default \
  -v "$(pwd)/apps/api:/workspace" \
  -e DATABASE_URL="postgresql://postgres:postgres@postgres:5432/enterprise" \
  node:20 bash -c \
  "cd /workspace && npm install -g prisma@5.22.0 2>/dev/null && prisma migrate dev --name init --skip-seed"
```

**Шаг 2 — Сгенерировать Prisma-клиент на хосте:**
```bash
pnpm --filter api run db:generate
```

**Шаг 3 — Заполнить базу начальными данными:**
```bash
docker run --rm --network infra_default \
  -v "$(pwd)/apps/api/prisma:/prisma-work" \
  -e DATABASE_URL="postgresql://postgres:postgres@postgres:5432/enterprise" \
  -e SEED_ORG_SLUG=default \
  -e APP_NAME="Enterprise Dev" \
  -e SEED_ADMIN_EMAIL=admin@example.com \
  -e SEED_ADMIN_KEYCLOAK_SUB=bootstrap-admin \
  node:20 bash -c \
  "mkdir /s && cd /s && npm init -y >/dev/null && npm install prisma@5.22.0 @prisma/client@5.22.0 >/dev/null \
   && cp /prisma-work/schema.prisma . && npx prisma generate >/dev/null && cp /prisma-work/seed.js . && node seed.js"
```

Сид создаёт:
- Организацию по умолчанию
- Суперадмина (`admin@example.com`) с временным Keycloak-идентификатором

---

### 6. Запуск серверов разработки

Откройте **три терминала**:

**Терминал 1 — Отслеживание типов** (перекомпилируется при каждом изменении):
```bash
pnpm --filter @enterprise/shared build --watch
```

**Терминал 2 — NestJS API** (горячая перезагрузка, порт 3001):
```bash
# Только первый раз: очистить устаревший кэш сборки
rm -f apps/api/tsconfig.tsbuildinfo

pnpm --filter api dev
```

Подождите: `Nest application successfully started`

**Терминал 3 — Next.js веб-приложение** (быстрое обновление, порт 3000):
```bash
pnpm --filter web dev
```

Подождите: `Ready - started server on 0.0.0.0:3000`

Откройте **http://localhost:3000** в браузере.

---

### 7. Первый вход и синхронизация аккаунта

Сид создаёт запись суперадмина с временным ID (`bootstrap-admin`). После первого входа через Keycloak нужно синхронизировать реальный UUID Keycloak в базу данных.

**Шаг 1 — Создать аккаунт суперадмина в Keycloak**

1. Откройте **http://localhost:8080** → нажмите **Administration Console** → войдите под `admin` / `admin`
2. Переключитесь на realm **enterprise** (выпадающий список вверху слева)
3. Перейдите в **Users → Add user**:
   - Username: `admin@example.com`
   - Email: `admin@example.com`
   - First name: `Super`, Last name: `Admin`
   - Email verified: включено
4. Сохраните, откройте вкладку **Credentials** → **Set password** → задайте пароль (например, `Admin1234!`), отключите «Temporary»
5. Откройте вкладку **Role mapping** → **Assign role** → фильтр по realm → назначьте роль `superadmin`
6. Скопируйте **ID** пользователя (UUID) из URL или вкладки **Details** (например, `0e4be01b-d0a5-4a8a-b0cd-8d4c487dd058`)

**Шаг 2 — Обновить запись в базе данных**

Выполните в Git Bash (замените UUID на ваш):
```bash
docker exec -it $(docker ps -qf "name=postgres") \
  psql -U postgres -d enterprise \
  -c "UPDATE users SET id = '0e4be01b-d0a5-4a8a-b0cd-8d4c487dd058', keycloak_sub = '0e4be01b-d0a5-4a8a-b0cd-8d4c487dd058' WHERE email = 'admin@example.com';"
```

**Шаг 3 — Войти в приложение**

Откройте **http://localhost:3000**, нажмите **Sign in** — вас перенаправит на Keycloak. Войдите под `admin@example.com` и паролем, который вы задали. Вы попадёте на Dashboard.

> **Совет:** Все новые пользователи, создаваемые после этого, должны добавляться через **Панель администратора** (⚙️ в боковом меню) — она одновременно создаёт аккаунт в Keycloak и запись в базе данных. Ручная синхронизация нужна только для первоначального суперадмина.

---

## Адреса сервисов

| Сервис | Адрес | Учётные данные |
|---|---|---|
| **Приложение** | http://localhost:3000 | `admin@example.com` / пароль, который вы задали |
| **API** | http://localhost:3001/api | — |
| **Консоль Keycloak** | http://localhost:8080 | `admin` / `admin` |
| **Консоль MinIO** | http://localhost:9001 | `minioadmin` / `minioadmin` |

---

## Полезные команды

```bash
# Проверка типов без сборки
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit

# Prisma Studio — визуальный просмотр базы данных
pnpm --filter api exec prisma studio

# Остановить все Docker-сервисы
docker compose -f infra/docker-compose.dev.yml down

# Полная очистка данных (ВНИМАНИЕ: удаляет базу данных)
docker compose -f infra/docker-compose.dev.yml down -v

# Просмотр логов конкретного сервиса
docker compose -f infra/docker-compose.dev.yml logs -f keycloak
docker compose -f infra/docker-compose.dev.yml logs -f postgres

# E2E-тесты (приложение должно быть запущено на порту 3000)
pnpm --filter web e2e
pnpm --filter web e2e:ui    # открывает интерфейс Playwright
```

---

## Опционально: Outlook и Teams

1. Зарегистрируйте приложение на [Azure Portal](https://portal.azure.com) → **App registrations → New registration**
2. Добавьте **Redirect URI**: `http://localhost:3001/api/oauth/microsoft/callback` (платформа Web)
3. В разделе **Certificates & secrets** создайте клиентский секрет
4. В разделе **API permissions** добавьте:
   - `Mail.Read`, `Mail.Send` (Delegated) — для Outlook
   - `ChannelMessage.Read.All`, `ChannelMessage.Send`, `Team.ReadBasic.All` (Delegated) — для Teams
5. В `apps/api/.env` и `apps/web/.env.local` задайте:

```env
MICROSOFT_CLIENT_ID=<Application (client) ID>
MICROSOFT_CLIENT_SECRET=<значение клиентского секрета>
MICROSOFT_TENANT_ID=<Directory (tenant) ID>
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/oauth/microsoft/callback
MICROSOFT_ENCRYPTION_KEY=<32 случайных байта в hex>
```

Ключ шифрования можно сгенерировать так:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Структура монорепозитория

```
apps/
  api/                NestJS бэкенд (порт 3001)
  web/                Next.js 15 фронтенд (порт 3000)
packages/
  shared/             Общие TypeScript-типы и Zod-валидаторы
infra/
  docker-compose.yml          Продакшн-стек
  docker-compose.dev.yml      Dev-инфраструктура (postgres, redis, keycloak, minio)
  keycloak/realm-export.json  Преднастроенный enterprise realm
  minio/init-buckets.sh       Создание бакетов при первом старте
docs/
  superpowers/
    specs/            Дизайн-документы функций
    plans/            Планы реализации
```
