#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${MKT53_APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SCHEDULE="${MKT53_SEMI_MONTHLY_CRON:-0 9 1,16 * *}"
LOG_DIR="${APP_DIR}/tmp/data-collection"
SEMI_MONTHLY_COMMAND="${MKT53_SEMI_MONTHLY_COMMAND:-npm run data:publish:semi-monthly:local}"
MARKER="mkt53 semi-monthly data refresh"
LEGACY_WEEKLY_MARKER="mkt53 weekly data refresh"

mkdir -p "${LOG_DIR}"

JOB="# ${MARKER}
${SCHEDULE} cd \"${APP_DIR}\" && ${SEMI_MONTHLY_COMMAND} >> \"${LOG_DIR}/semi-monthly-refresh.log\" 2>&1"

if [[ "${1:-}" == "--print" ]]; then
  printf '%s\n' "${JOB}"
  exit 0
fi

tmp_file="$(mktemp)"
{
  crontab -l 2>/dev/null \
    | grep -v "${MARKER}" \
    | grep -v "${LEGACY_WEEKLY_MARKER}" \
    | grep -v "npm run data:deploy:semi-monthly" \
    | grep -v "npm run data:publish:semi-monthly:local" \
    | grep -v "npm run data:deploy:weekly" \
    | grep -v "npm run data:publish:weekly:local" \
    || true
  printf '%s\n' "${JOB}"
} > "${tmp_file}"

crontab "${tmp_file}"
rm -f "${tmp_file}"

echo "Installed ${MARKER} cron for ${APP_DIR}"
