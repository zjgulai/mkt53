#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_ID="${MKT53_SEMI_MONTHLY_RUN_ID:-$(date +%Y%m%d_%H%M%S)}"
RUN_LOG_DIR="${APP_DIR}/tmp/data-collection/runs/${RUN_ID}"
mkdir -p "${RUN_LOG_DIR}"

run_step() {
  local name="$1"
  local log_file="$2"
  shift 2

  echo "==> ${name}"

  set +e
  "$@" 2>&1 | tee "${log_file}"
  local status=${PIPESTATUS[0]}
  set -e

  if [[ ${status} -ne 0 ]]; then
    echo "==> ${name} failed: status=${status}" >&2
  else
    echo "==> ${name} done"
  fi

  return ${status}
}

REFRESH_LOG="${RUN_LOG_DIR}/refresh.log"
DEPLOY_LOG="${RUN_LOG_DIR}/deploy-prod.log"
SMOKE_LOG="${RUN_LOG_DIR}/smoke.log"
E2E_LOG="${RUN_LOG_DIR}/e2e-prod.log"
REPORT_LOG="${RUN_LOG_DIR}/run-report.log"

HAS_FAILURE=0

cd "${APP_DIR}"

run_step "data refresh" "${REFRESH_LOG}" npm run data:refresh:semi-monthly -- "$@"
REFRESH_STATUS=$?
if [[ ${REFRESH_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "deploy:prod" "${DEPLOY_LOG}" npm run deploy:prod
DEPLOY_STATUS=$?
if [[ ${DEPLOY_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "smoke:prod" "${SMOKE_LOG}" npm run smoke:prod
SMOKE_STATUS=$?
if [[ ${SMOKE_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "test:e2e:prod" "${E2E_LOG}" npm run test:e2e:prod
E2E_STATUS=$?
if [[ ${E2E_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "build semi-monthly run report" "${REPORT_LOG}" npm run data:semi-monthly:report -- --run-id "${RUN_ID}" --source "semi-monthly-deploy" --refresh-log "${REFRESH_LOG}" --deploy-log "${DEPLOY_LOG}" --smoke-log "${SMOKE_LOG}" --e2e-log "${E2E_LOG}" --refresh-status "${REFRESH_STATUS}" --deploy-status "${DEPLOY_STATUS}" --smoke-status "${SMOKE_STATUS}" --e2e-status "${E2E_STATUS}" --json
RUN_REPORT_STATUS=$?
if [[ ${RUN_REPORT_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

if [[ ${HAS_FAILURE} -ne 0 ]]; then
  echo "Semi-monthly deploy sequence failed. See run log: ${RUN_LOG_DIR}" >&2
  exit 1
fi

echo "Semi-monthly deploy sequence passed. Run report generated."
