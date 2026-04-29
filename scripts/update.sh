#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/../infra" && pwd)"

info()    { echo "[INFO] $*"; }
success() { echo "[OK]   $*"; }

cd "$INFRA_DIR"

info "Pulling latest images..."
docker compose --env-file .env pull

info "Restarting services with rolling update..."
docker compose --env-file .env up -d --remove-orphans

info "Running database migrations..."
docker compose --env-file .env exec -T api pnpm prisma migrate deploy

success "Update complete."
