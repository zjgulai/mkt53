#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${APP_DIR}"

npm run data:refresh:semi-monthly -- "$@"
npm run deploy:prod:verified
