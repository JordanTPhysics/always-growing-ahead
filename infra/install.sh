#!/usr/bin/env bash
# Full VPS install from git. Does not overwrite .env / secrets.
#
#   sudo bash infra/install.sh
#
# Or from a fresh VPS (script cloned/copied first):
#
#   sudo REPO_URL=git@github.com:JordanTPhysics/always-growing-ahead.git bash install.sh
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/JordanTPhysics/always-growing-ahead.git}"
BRANCH="${BRANCH:-main}"
DEFAULT_DIR="/opt/aga"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$here/docker-compose.yml" && -f "$here/../package.json" ]]; then
  INSTALL_DIR="$(cd "$here/.." && pwd)"
else
  INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_DIR}"
fi

APP_ENV="$INSTALL_DIR/.env"
INFRA_DIR="$INSTALL_DIR/infra"
INFRA_ENV="$INFRA_DIR/.env"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

need_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    die "Run as root (sudo bash infra/install.sh)."
  fi
}

install_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y --no-install-recommends ca-certificates curl git openssl
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y ca-certificates curl git openssl
  else
    die "Need apt-get or dnf to install git/curl."
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return
  fi
  log "Installing Docker Engine + Compose"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  docker compose version >/dev/null || die "docker compose plugin is missing."
}

ensure_github_known_hosts() {
  mkdir -p "$HOME/.ssh"
  chmod 700 "$HOME/.ssh"
  if [[ ! -f "$HOME/.ssh/known_hosts" ]] || ! grep -q github.com "$HOME/.ssh/known_hosts"; then
    ssh-keyscan -t ed25519 github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true
  fi
}

print_deploy_key_help() {
  if [[ ! -f "$HOME/.ssh/id_ed25519" ]]; then
    ssh-keygen -t ed25519 -N "" -f "$HOME/.ssh/id_ed25519"
  fi
  cat <<EOF

Cannot clone $REPO_URL.

If the repo is private, add this VPS as a GitHub deploy key
(Settings → Deploy keys, read-only), then re-run with SSH:

  sudo REPO_URL=git@github.com:JordanTPhysics/always-growing-ahead.git bash $0

Public key:
$(cat "$HOME/.ssh/id_ed25519.pub")

EOF
}

sync_repo() {
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    log "Updating $INSTALL_DIR ($BRANCH)"
    git -C "$INSTALL_DIR" fetch origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout "$BRANCH"
    git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
    return
  fi

  log "Cloning $REPO_URL → $INSTALL_DIR"
  ensure_github_known_hosts
  if ! git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"; then
    print_deploy_key_help
    exit 1
  fi
}

copy_env_if_missing() {
  local src="$1" dest="$2"
  if [[ -f "$dest" ]]; then
    printf '    keep %s\n' "$dest"
    return 1
  fi
  cp "$src" "$dest"
  chmod 600 "$dest"
  printf '    created %s (from example)\n' "$dest"
  return 0
}

prepare_env_files() {
  log "Env files (existing secrets are never overwritten)"
  mkdir -p "$INFRA_DIR"

  if copy_env_if_missing "$INFRA_DIR/.env.example" "$INFRA_ENV"; then
    sed -i 's/^MYSQL_INNODB_BUFFER_POOL=.*/MYSQL_INNODB_BUFFER_POOL=1G/' "$INFRA_ENV" || true
  fi
  copy_env_if_missing "$INFRA_DIR/env.app.vps.example" "$APP_ENV" || true

  # Windows-edited .env files leave CR and make mysqld reject innodb-buffer-pool-size.
  sed -i 's/\r$//' "$INFRA_ENV" "$APP_ENV" 2>/dev/null || true

  if grep -q 'change-me-' "$INFRA_ENV" || grep -Eq '^AUTH_SECRET=\s*$' "$APP_ENV" || grep -Eq '^SMTP_PASSWORD=\s*$' "$APP_ENV"; then
    cat <<EOF

Fill in secrets, then re-run this script. Nothing will overwrite those files.

  nano $INFRA_ENV
  nano $APP_ENV

Minimum:
  - infra/.env: MYSQL_* passwords, MINIO_ROOT_PASSWORD (8+ chars)
  - .env: AUTH_SECRET ($(openssl rand -base64 32))
  - .env: DB_PASSWORD = infra MYSQL_PASSWORD
  - .env: S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY = MINIO_ROOT_USER / MINIO_ROOT_PASSWORD
  - .env: AUTH_URL, NEXTAUTH_URL, S3_PUBLIC_URL, CAPACITOR_SERVER_URL
            (https://alwaysgrowingahead.com / https://files.alwaysgrowingahead.com)
  - .env: SMTP_PASSWORD (IONOS mailbox password for admin@alwaysgrowingahead.com)
  - .env: GOOGLE_MAPS_API_KEY (browser Maps key; restrict by HTTP referrer)

EOF
    exit 1
  fi

  if ! grep -Eq '^(GOOGLE_MAPS_API_KEY|NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)=.+' "$APP_ENV"; then
    printf 'WARNING: no Google Maps API key in %s — job/worker maps will be blank.\n' "$APP_ENV"
  fi
}

compose() {
  docker compose \
    --project-directory "$INFRA_DIR" \
    --env-file "$INFRA_ENV" \
    --env-file "$APP_ENV" \
    -f "$INFRA_DIR/docker-compose.yml" \
    "$@"
}

start_stack() {
  log "Starting MySQL + MinIO"
  compose up -d mysql minio
  compose run --rm --no-deps minio-init

  log "Applying database schema"
  compose --profile tools run --rm migrate
  compose --profile tools run --rm migrate-test

  log "Building and starting the app"
  compose up -d --build app caddy
}

print_done() {
  cat <<EOF

Install complete.

  App:    https://alwaysgrowingahead.com
  Files:  https://files.alwaysgrowingahead.com

  docker compose -f $INFRA_DIR/docker-compose.yml ps
  docker compose -f $INFRA_DIR/docker-compose.yml logs -f app

Re-run this script after git changes to pull, migrate, and rebuild.

EOF
}

need_root
install_packages
install_docker
sync_repo
prepare_env_files
start_stack
print_done
