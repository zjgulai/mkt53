#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${MKT53_APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SCHEDULE="${MKT53_WEEKLY_CRON:-15 3 * * 1}"
LOG_DIR="${APP_DIR}/tmp/data-collection"
MARKER="mkt53 weekly data refresh"

mkdir -p "${LOG_DIR}"

JOB="# ${MARKER}
${SCHEDULE} cd \"${APP_DIR}\" && npm run data:deploy:weekly >> \"${LOG_DIR}/weekly-refresh.log\" 2>&1"

if [[ "${1:-}" == "--print" ]]; then
  printf '%s\n' "${JOB}"
  exit 0
fi

tmp_file="$(mktemp)"
{
  crontab -l 2>/dev/null | grep -v "${MARKER}" | grep -v "npm run data:deploy:weekly" || true
  printf '%s\n' "${JOB}"
} > "${tmp_file}"

crontab "${tmp_file}"
rm -f "${tmp_file}"

echo "Installed ${MARKER} cron for ${APP_DIR}"
