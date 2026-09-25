#!/usr/bin/env bash
# Update SEMRA to the latest code and restart under pm2.
# Usage: bash update.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> Pulling latest code"
git pull

echo "==> Installing dependencies"
npm ci --omit=dev

echo "==> Running tests"
npm test

echo "==> Restarting pm2 process"
pm2 restart semra

pm2 status semra
