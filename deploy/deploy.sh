#!/usr/bin/env bash
# Builds the latest main in a new release folder, migrates the database, then
# switches the live symlink and restarts. A failed build leaves the live site as
# it was. Run as root: `sudo /srv/tinvo/deploy.sh` (also run by "Publish").
set -euo pipefail

R=/srv/tinvo
REPO=https://github.com/Sahil-957/Starshift-TRINVO.git
NEW="$R/releases/$(date +%Y%m%d-%H%M%S)"
as_tinvo() { sudo -u tinvo -H "$@"; }

exec 9>/var/lib/tinvo/deploy.lock
flock -n 9 || { echo "a deploy is already running"; exit 0; }

echo "→ fetching $REPO"
as_tinvo git clone --quiet --depth 1 "$REPO" "$NEW"
as_tinvo ln -s "$R/shared/storefront.env" "$NEW/.env.local"
as_tinvo ln -s "$R/shared/admin.env" "$NEW/tinvo-admin/.env.local"
cd "$NEW"

echo "→ installing"
as_tinvo npm ci --no-audit --no-fund --loglevel=error
echo "→ building admin"
as_tinvo npm run build -w tinvo-admin
echo "→ migrating database"
as_tinvo npm run db:migrate -w tinvo-admin
echo "→ building storefront (pulls the catalogue from the running admin)"
as_tinvo npm run build

echo "→ switching to $(basename "$NEW")"
ln -sfn "$NEW" "$R/current"
install -m 755 "$NEW/deploy/deploy.sh" "$R/deploy.sh"
systemctl restart tinvo-admin tinvo-storefront

# keep the last 3 releases for a quick rollback
ls -1dt "$R"/releases/* | tail -n +4 | xargs -r rm -rf
echo "✓ deployed $(as_tinvo git -C "$NEW" rev-parse --short HEAD)"
