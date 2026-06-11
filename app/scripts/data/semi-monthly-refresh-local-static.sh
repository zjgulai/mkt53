#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HTML_DIR="${MKT53_STATIC_HTML_DIR:-/opt/mkt53/html}"
AMAZON_PRIVATE_DIR="${MKT53_AMAZON_PRIVATE_DIR:-/opt/mkt53/private}"
AMAZON_PRIVATE_AUDIT_PATH="${MKT53_AMAZON_PRIVATE_AUDIT_PATH:-${AMAZON_PRIVATE_DIR}/amazon-commerce-private-input-audit.json}"
PRIVATE_AUDIT_REQUIRED="${MKT53_PRIVATE_AUDIT_REQUIRED:-0}"

if [[ ! -d "${HTML_DIR}" ]]; then
  echo "Missing static html directory: ${HTML_DIR}" >&2
  exit 1
fi

cd "${APP_DIR}"

npm run data:refresh:semi-monthly -- "$@"

publish_private_amazon_audit() {
  if [[ ! -d "${AMAZON_PRIVATE_DIR}" ]]; then
    echo "Skipped Amazon private input audit; missing private directory: ${AMAZON_PRIVATE_DIR}"
    return 0
  fi

  if npm run data:connector:amazon:private:audit -- --private-dir "${AMAZON_PRIVATE_DIR}" --write "${AMAZON_PRIVATE_AUDIT_PATH}" --force; then
    echo "Updated Amazon private input audit at ${AMAZON_PRIVATE_AUDIT_PATH}"
    return 0
  fi

  echo "Amazon private input audit failed for ${AMAZON_PRIVATE_DIR}" >&2
  if [[ "${PRIVATE_AUDIT_REQUIRED}" == "1" ]]; then
    return 1
  fi

  echo "Continuing public semi-monthly refresh because MKT53_PRIVATE_AUDIT_REQUIRED is not 1" >&2
}

publish_private_amazon_audit

npm run test
npm run lint
npm audit
npm run build

rsync -az --delete dist/ "${HTML_DIR}/"
echo "Published semi-monthly refreshed dist/ to ${HTML_DIR}/"
