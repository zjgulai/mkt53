#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HTML_DIR="${MKT53_STATIC_HTML_DIR:-/opt/mkt53/html}"

if [[ ! -d "${HTML_DIR}" ]]; then
  echo "Missing static html directory: ${HTML_DIR}" >&2
  exit 1
fi

cd "${APP_DIR}"

npm run data:refresh:weekly
npm run test
npm run lint
npm audit
npm run build

rsync -az --delete dist/ "${HTML_DIR}/"
echo "Published weekly refreshed dist/ to ${HTML_DIR}/"
