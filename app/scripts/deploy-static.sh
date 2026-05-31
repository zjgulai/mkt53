#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/.." && pwd)"
KEY_PATH="${REPO_ROOT}/ai_video.pem"
REMOTE="${REMOTE:-ubuntu@101.34.52.232}"
REMOTE_PATH="${REMOTE_PATH:-/opt/mkt53/html/}"

if [[ ! -f "${KEY_PATH}" ]]; then
  echo "Missing SSH key: ${KEY_PATH}" >&2
  exit 1
fi

cd "${APP_DIR}"

npm run test
npm run lint
npm audit
npm run build

rsync -az --delete \
  -e "ssh -i ${KEY_PATH} -o BatchMode=yes" \
  dist/ "${REMOTE}:${REMOTE_PATH}"

echo "Deployed dist/ to ${REMOTE}:${REMOTE_PATH}"
