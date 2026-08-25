#!/usr/bin/env bash
# SEMRA one-shot deployment for a fresh Ubuntu server.
#
# Usage (from inside the project directory):
#   bash deploy.sh                 # install deps, set up pm2, done
#   sudo bash deploy.sh --caddy    # same + Caddy reverse proxy with auto-TLS
#
# Assumes the repo is already on the server (git clone / scp / rsync).
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="semra"
PORT="${PORT:-8080}"
DOMAIN="${DOMAIN:-}"   # export DOMAIN=example.com to configure Caddy

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo bash deploy.sh"; exit 1; }

# ── 1. Node.js 20 LTS ────────────────────────────────────────────────────────
if command -v node >/dev/null 2>&1 && [[ "$(node -v)" =~ ^v(2[0-9]|[3-9][0-9]) ]]; then
    log "Node $(node -v) already installed"
else
    log "Installing Node.js 25 LTS"
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg
    install -dm0755 /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_25.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list
    apt-get update -qq && apt-get install -y -qq nodejs
fi

# ── 2. pm2 ───────────────────────────────────────────────────────────────────
if ! command -v pm2 >/dev/null 2>&1; then
    log "Installing pm2"
    npm install -g pm2@latest
else
    log "pm2 $(pm2 -v) already installed"
fi

# ── 3. App dependencies ──────────────────────────────────────────────────────
cd "$APP_DIR"
log "Installing app dependencies ($(npm --version))"
sudo -u "${SUDO_USER:-root}" npm ci --omit=dev

# ── 4. Start under pm2 ───────────────────────────────────────────────────────
log "Starting $APP_NAME on port $PORT via pm2"
sudo -u "${SUDO_USER:-root}" pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
sudo -u "${SUDO_USER:-root}" env PORT="$PORT" \
    pm2 start npm --name "$APP_NAME" -- start
sudo -u "${SUDO_USER:-root}" pm2 save

# ── 5. Boot persistence ──────────────────────────────────────────────────────
log "Configuring pm2 to start on boot"
# `pm2 startup` prints a command; run it as root.
STARTUP_CMD="$(sudo -u "${SUDO_USER:-root}" pm2 startup systemd -u "${SUDO_USER:-root}" --hp "/home/${SUDO_USER:-root}" 2>/dev/null | grep 'sudo ' | head -n1)"
if [[ -n "${STARTUP_CMD:-}" ]]; then eval "$STARTUP_CMD"; fi

# ── 6. Firewall (optional but recommended) ───────────────────────────────────
if command -v ufw >/dev/null 2>&1; then
    log "Opening firewall ports (22, 80, 443)"
    ufw allow OpenSSH >/dev/null 2>&1 || true
    ufw allow 80/tcp  >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    # NOTE: port $PORT is deliberately NOT opened publicly — reach it via
    # the reverse proxy below. If you skip the proxy and expose it directly,
    # remember DEPLOYMENT.md: the admin panel has NO authentication.
fi

# ── 7. Caddy reverse proxy (optional, gives HTTPS) ──────────────────────────
if [[ "${1:-}" == "--caddy" ]]; then
    log "Installing Caddy"
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
        | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
        > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq && apt-get install -y -qq caddy

    if [[ -z "$DOMAIN" ]]; then
        echo "Set DOMAIN=my.domain.com and re-run with --caddy to configure TLS."
    else
        log "Configuring Caddy for $DOMAIN -> 127.0.0.1:$PORT"
        cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy 127.0.0.1:$PORT
}
EOF
        systemctl reload caddy
        echo "HTTPS live at https://$DOMAIN (Caddy handles TLS automatically)"
    fi
fi

log "Done. Useful commands:"
echo "  pm2 status            # is it running?"
echo "  pm2 logs $APP_NAME     # live logs (look for 🕌 and ⏰ lines)"
echo "  pm2 restart $APP_NAME  # after pulling new code"
