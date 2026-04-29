#Requires -Version 5.1

# Re-launch with ExecutionPolicy Bypass if the current policy would block us.
if ($MyInvocation.ScriptName -ne '' -and
    (Get-ExecutionPolicy -Scope Process) -eq 'Restricted') {
  $args = @('-ExecutionPolicy', 'Bypass', '-NonInteractive', '-File', $MyInvocation.MyCommand.Path)
  Start-Process powershell -ArgumentList $args -NoNewWindow -Wait
  exit $LASTEXITCODE
}

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir   = Split-Path -Parent $ScriptDir
$InfraDir  = Join-Path $RootDir "infra"

function Info    { param($Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Cyan }
function Success { param($Msg) Write-Host "[OK]    $Msg" -ForegroundColor Green }
function Warn    { param($Msg) Write-Host "[WARN]  $Msg" -ForegroundColor Yellow }
function Fail    { param($Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Blue
Write-Host "   Enterprise Platform Installer" -ForegroundColor Blue
Write-Host "=========================================================" -ForegroundColor Blue
Write-Host ""

# ── Prerequisites ──────────────────────────────────────────────────────────────

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop/"
}

try { docker compose version | Out-Null }
catch { Fail "Docker Compose plugin not found. Ensure Docker Desktop is up to date." }

Success "Docker and Docker Compose are available."

# ── Configuration prompts ──────────────────────────────────────────────────────

Write-Host ""
Info "Configure your installation:"
Write-Host ""

$AppName = Read-Host "Company name [My Company]"
if ([string]::IsNullOrWhiteSpace($AppName)) { $AppName = "My Company" }

$Domain = Read-Host "Domain / hostname [localhost]"
if ([string]::IsNullOrWhiteSpace($Domain)) { $Domain = "localhost" }

$AppUrl = if ($Domain -eq "localhost") { "http://localhost" } else { "https://$Domain" }

$AdminEmail = Read-Host "Admin email [admin@$Domain]"
if ([string]::IsNullOrWhiteSpace($AdminEmail)) { $AdminEmail = "admin@$Domain" }

$AdminPassword = Read-Host "Admin password" -AsSecureString
$AdminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword))
if ([string]::IsNullOrWhiteSpace($AdminPasswordPlain)) { Fail "Admin password cannot be empty." }

$PgPassword = Read-Host "PostgreSQL password" -AsSecureString
$PgPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PgPassword))
if ([string]::IsNullOrWhiteSpace($PgPasswordPlain)) { Fail "PostgreSQL password cannot be empty." }

$MinioPassword = Read-Host "MinIO password" -AsSecureString
$MinioPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($MinioPassword))
if ([string]::IsNullOrWhiteSpace($MinioPasswordPlain)) { Fail "MinIO password cannot be empty." }

$KcAdminPass = Read-Host "Keycloak admin password" -AsSecureString
$KcAdminPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($KcAdminPass))
if ([string]::IsNullOrWhiteSpace($KcAdminPassPlain)) { Fail "Keycloak admin password cannot be empty." }

# ── Generate random keys ───────────────────────────────────────────────────────

$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$EncryptionKey = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""

$kcSecretBytes = New-Object byte[] 24
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($kcSecretBytes)
$KcClientSecret = ($kcSecretBytes | ForEach-Object { $_.ToString("x2") }) -join ""

# ── Write .env ────────────────────────────────────────────────────────────────

$EnvFile = Join-Path $InfraDir ".env"
Info "Writing $EnvFile..."

@"
APP_NAME=$AppName
APP_URL=$AppUrl
NODE_ENV=production

POSTGRES_DB=enterprise_platform
POSTGRES_USER=appuser
POSTGRES_PASSWORD=$PgPasswordPlain

REDIS_HOST=redis
REDIS_PORT=6379

KEYCLOAK_REALM=enterprise
KEYCLOAK_CLIENT_ID=enterprise-app
KEYCLOAK_CLIENT_SECRET=$KcClientSecret
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=$KcAdminPassPlain

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$MinioPasswordPlain
MINIO_BUCKET_AVATARS=avatars
MINIO_BUCKET_CHAT=chat-media
MINIO_BUCKET_KANBAN=kanban-attachments

ENCRYPTION_KEY=$EncryptionKey

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=$AppUrl/api/oauth/microsoft/callback

SEED_ORG_SLUG=default
SEED_ADMIN_EMAIL=$AdminEmail
SEED_ADMIN_KEYCLOAK_SUB=bootstrap-admin
"@ | Out-File -FilePath $EnvFile -Encoding utf8

Success ".env written."

# ── Self-signed TLS certificate ───────────────────────────────────────────────

$SslDir = Join-Path $InfraDir "nginx\ssl"
New-Item -ItemType Directory -Force -Path $SslDir | Out-Null

if ($Domain -eq "localhost" -or $true) {
  Info "Generating self-signed TLS certificate for $Domain..."
  $cert = New-SelfSignedCertificate `
    -Subject "CN=$Domain" `
    -DnsName $Domain, "localhost" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -CertStoreLocation "Cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears(10)

  $certPath = Join-Path $SslDir "server.crt"
  $keyPath  = Join-Path $SslDir "server.key"

  # Export public certificate (PEM)
  $certBytes = $cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert)
  $b64 = [Convert]::ToBase64String($certBytes, [Base64FormattingOptions]::InsertLineBreaks)
  "-----BEGIN CERTIFICATE-----`n$b64`n-----END CERTIFICATE-----" | Out-File -FilePath $certPath -Encoding ASCII

  # Export private key (PFX → extract key via openssl if available, else warn)
  if (Get-Command openssl -ErrorAction SilentlyContinue) {
    $pfxPath = Join-Path $SslDir "server.pfx"
    $pfxPwd = "temppass"
    [IO.File]::WriteAllBytes($pfxPath, $cert.Export(
      [Security.Cryptography.X509Certificates.X509ContentType]::Pfx, $pfxPwd))
    openssl pkcs12 -in $pfxPath -nocerts -nodes -passin pass:$pfxPwd -out $keyPath 2>$null
    Remove-Item $pfxPath -Force
  } else {
    Warn "openssl not found; cannot extract private key. Install Git for Windows (which includes openssl) and re-run."
    Warn "Alternatively, provide your own certificate at $certPath and $keyPath."
  }

  Success "Certificate written to $SslDir\"
}

# ── Start stack ───────────────────────────────────────────────────────────────

Info "Pulling Docker images (this may take a few minutes)..."
Set-Location $InfraDir
docker compose --env-file .env pull

Info "Starting services..."
docker compose --env-file .env up -d

# ── Health check ──────────────────────────────────────────────────────────────

Info "Waiting for API to become healthy..."
$MaxRetries = 40
$Retry = 0
$HealthUrl = "http://localhost/api/health"

do {
  Start-Sleep -Seconds 3
  $Retry++
  try {
    $resp = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($resp.StatusCode -eq 200) { break }
  } catch { }
  Write-Host -NoNewline "."
} while ($Retry -lt $MaxRetries)

if ($Retry -ge $MaxRetries) {
  Fail "API did not become healthy. Check logs: docker compose logs api"
}
Write-Host ""
Success "API is healthy."

# ── Migrations and seed ───────────────────────────────────────────────────────

Info "Running database migrations..."
docker compose --env-file .env exec -T api pnpm prisma migrate deploy

Info "Seeding initial data..."
docker compose --env-file .env exec -T `
  -e "SEED_ADMIN_EMAIL=$AdminEmail" `
  -e "SEED_ORG_SLUG=default" `
  api pnpm run seed

# ── Done ──────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Success "Installation complete!"
Write-Host ""
Write-Host "  URL:           $AppUrl"
Write-Host "  Admin email:   $AdminEmail"
Write-Host "  Keycloak:      $AppUrl/auth/admin  (user: admin)"
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""
Warn "For self-signed certificates, your browser will show a security warning."
Warn "Accept it or import $SslDir\server.crt as a trusted root CA."
Write-Host ""
