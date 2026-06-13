#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${APP_DIR}"

echo "==> Deploying static bundle to production"
npm run deploy:prod

echo "==> Running production smoke checks"
npm run smoke:prod

echo "==> Running production E2E checks"
npm run test:e2e:prod

echo "Verified production deploy completed"
