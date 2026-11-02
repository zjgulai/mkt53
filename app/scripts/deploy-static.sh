#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/.." && pwd)"
source "${APP_DIR}/scripts/lib/ssh-key-contract.sh"
KEY_PATH="$(mkt53_resolve_ssh_key_path "${REPO_ROOT}")"
REMOTE="${REMOTE:-ubuntu@101.34.52.232}"
REMOTE_PATH="${REMOTE_PATH:-/opt/mkt53/html/}"

mkt53_require_ssh_key "${KEY_PATH}" "production deploy"

cd "${APP_DIR}"

npm run test:serial
npm run lint
# 只审计生产依赖：静态产物不打包 devDependencies；dev 工具链 advisory 不应阻断发布
npm audit --omit=dev
npm run build
npm run quality:bundle-budget

rsync -az --delete \
  -e "ssh -i ${KEY_PATH} -o BatchMode=yes" \
  dist/ "${REMOTE}:${REMOTE_PATH}"

echo "Deployed dist/ to ${REMOTE}:${REMOTE_PATH}"
