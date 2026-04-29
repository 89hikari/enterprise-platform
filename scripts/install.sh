#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

echo ""
echo "========================================================="
echo "   Enterprise Platform Installer"
echo "========================================================="
echo ""

# ── Prerequisites ──────────────────────────────────────────────────────────────

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    return 1
  fi
}

if ! check_cmd docker; then
  warn "Docker not found."
  read -rp "Install Docker automatically? [y/N]: " install_docker
  if [[ "$install_docker" =~ ^[Yy]$ ]]; then
    info "Installing Docker via official script..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    warn "Docker installed. You may need to log out and back in for group changes to take effect."
    warn "Re-run this installer after logging back in."
    exit 0
  else
    error "Docker is required. Please install it manually from https://docs.docker.com/get-docker/"
  fi
fi

if ! docker compose version &>/dev/null 2>&1; then
  error "Docker Compose plugin not found. Please install it: https://docs.docker.com/compose/install/"
fi

check_cmd openssl || error "openssl is required. Install it with your package manager."
check_cmd curl    || error "curl is required. Install it with your package manager."

success "Prerequisites satisfied."

# ── Configuration prompts ──────────────────────────────────────────────────────

echo ""
info "Configure your installation:"
echo ""

read -rp "Company name [My Company]: " APP_NAME
APP_NAME="${APP_NAME:-My Company}"

read -rp "Domain / hostname [localhost]: " DOMAIN
DOMAIN="${DOMAIN:-localhost}"

APP_URL="https://$DOMAIN"
if [[ "$DOMAIN" == "localhost" ]]; then
  APP_URL="http://localhost"
fi

read -rp "Admin email [admin@$DOMAIN]: " ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@$DOMAIN}"

read -rsp "Admin password: " ADMIN_PASSWORD
echo ""
[[ -z "$ADMIN_PASSWORD" ]] && error "Admin password cannot be empty."

read -rsp "PostgreSQL password: " POSTGRES_PASSWORD
echo ""
[[ -z "$POSTGRES_PASSWORD" ]] && error "PostgreSQL password cannot be empty."

read -rsp "MinIO password: " MINIO_PASSWORD
echo ""
[[ -z "$MINIO_PASSWORD" ]] && error "MinIO password cannot be empty."

read -rsp "Keycloak admin password: " KEYCLOAK_ADMIN_PASSWORD
echo ""
[[ -z "$KEYCLOAK_ADMIN_PASSWORD" ]] && error "Keycloak admin password cannot be empty."

USE_SELF_SIGNED="y"
if [[ "$APP_URL" == https* ]]; then
  read -rp "Generate self-signed TLS certificate? [Y/n]: " USE_SELF_SIGNED
  USE_SELF_SIGNED="${USE_SELF_SIGNED:-y}"
fi

# ── Generate .env ──────────────────────────────────────────────────────────────

ENCRYPTION_KEY=$(openssl rand -hex 32)
KEYCLOAK_CLIENT_SECRET=$(openssl rand -hex 24)

ENV_FILE="$INFRA_DIR/.env"
info "Writing $ENV_FILE..."

cat > "$ENV_FILE" << EOF
APP_NAME=$APP_NAME
APP_URL=$APP_URL
NODE_ENV=production

POSTGRES_DB=enterprise_platform
POSTGRES_USER=appuser
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

REDIS_HOST=redis
REDIS_PORT=6379

KEYCLOAK_REALM=enterprise
KEYCLOAK_CLIENT_ID=enterprise-app
KEYCLOAK_CLIENT_SECRET=$KEYCLOAK_CLIENT_SECRET
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=$KEYCLOAK_ADMIN_PASSWORD

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD
MINIO_BUCKET_AVATARS=avatars
MINIO_BUCKET_CHAT=chat-media
MINIO_BUCKET_KANBAN=kanban-attachments

ENCRYPTION_KEY=$ENCRYPTION_KEY

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=${APP_URL}/api/oauth/microsoft/callback

SEED_ORG_SLUG=default
SEED_ADMIN_EMAIL=$ADMIN_EMAIL
SEED_ADMIN_KEYCLOAK_SUB=bootstrap-admin
EOF

success ".env written."

# ── TLS certificate ────────────────────────────────────────────────────────────

SSL_DIR="$INFRA_DIR/nginx/ssl"
mkdir -p "$SSL_DIR"

if [[ "$USE_SELF_SIGNED" =~ ^[Yy]$ ]]; then
  info "Generating self-signed TLS certificate for $DOMAIN..."
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$SSL_DIR/server.key" \
    -out "$SSL_DIR/server.crt" \
    -subj "/CN=$DOMAIN/O=Enterprise/C=US" \
    -extensions v3_ca \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1" \
    2>/dev/null
  success "Self-signed certificate created at $SSL_DIR/"
fi

# ── Pull images and start stack ───────────────────────────────────────────────

info "Pulling Docker images (this may take a few minutes)..."
cd "$INFRA_DIR"
docker compose --env-file .env pull

info "Starting services..."
docker compose --env-file .env up -d

# ── Wait for API health check ─────────────────────────────────────────────────

HEALTH_URL="http://localhost/api/health"
if [[ "$APP_URL" == http://localhost* ]]; then
  HEALTH_URL="http://localhost/api/health"
fi

info "Waiting for API to become healthy..."
MAX_RETRIES=40
RETRY=0
until curl -sf "$HEALTH_URL" > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [[ $RETRY -ge $MAX_RETRIES ]]; then
    error "API did not become healthy after $((MAX_RETRIES * 3)) seconds. Check logs: docker compose logs api"
  fi
  echo -n "."
  sleep 3
done
echo ""
success "API is healthy."

# ── Run migrations and seed ───────────────────────────────────────────────────

info "Running database migrations..."
docker compose --env-file .env exec -T api pnpm prisma migrate deploy

info "Seeding initial data..."
docker compose --env-file .env exec -T api \
  env SEED_ADMIN_EMAIL="$ADMIN_EMAIL" SEED_ORG_SLUG=default \
  pnpm run seed

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "========================================================="
success "Installation complete!"
echo ""
echo "  URL:           $APP_URL"
echo "  Admin email:   $ADMIN_EMAIL"
echo "  Admin password: (as entered)"
echo ""
echo "  Keycloak admin: $APP_URL/auth/admin"
echo "  Keycloak user:  admin"
echo "  Keycloak pass:  (as entered)"
echo "========================================================="
echo ""
warn "IMPORTANT: For self-signed certificates, your browser will show a security warning."
warn "You can accept the warning or install the certificate from $SSL_DIR/server.crt as trusted."
echo ""
