#!/usr/bin/env bash
# One-time server setup on Ubuntu 24.04: Node 24, Caddy, a `tinvo` user, folders,
# swap for builds, and the services. Run as root from a checkout of the repo:
#   sudo bash deploy/setup.sh
# Then put the two env files in /srv/tinvo/shared/ and run: sudo /srv/tinvo/deploy.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

apt-get update -q
apt-get install -y -q curl git gnupg debian-keyring debian-archive-keyring apt-transport-https

# Node 24 (same major as development)
if ! node -v 2>/dev/null | grep -q '^v24'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y -q nodejs
fi

# Caddy: web server with automatic HTTPS
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q && apt-get install -y -q caddy
fi

# 2 GB swap so builds never run out of memory
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

id tinvo >/dev/null 2>&1 || useradd --system --create-home --home-dir /srv/tinvo --shell /usr/sbin/nologin tinvo
install -d -o tinvo -g tinvo -m 750 /srv/tinvo /srv/tinvo/releases /srv/tinvo/shared /var/lib/tinvo
touch /var/lib/tinvo/publish.request && chown tinvo:tinvo /var/lib/tinvo/publish.request

install -m 755 "$HERE/deploy.sh" /srv/tinvo/deploy.sh
install -m 644 "$HERE"/systemd/* /etc/systemd/system/
install -m 644 "$HERE/Caddyfile" /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable tinvo-storefront tinvo-admin tinvo-sync.timer tinvo-publish.path
systemctl start tinvo-sync.timer tinvo-publish.path
systemctl reload caddy || systemctl restart caddy

echo "✓ server ready. Next: /srv/tinvo/shared/{storefront,admin}.env, then sudo /srv/tinvo/deploy.sh"
