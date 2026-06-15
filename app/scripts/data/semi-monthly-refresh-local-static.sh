#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HTML_DIR="${MKT53_STATIC_HTML_DIR:-/opt/mkt53/html}"
AMAZON_PRIVATE_DIR="${MKT53_AMAZON_PRIVATE_DIR:-/opt/mkt53/private}"
AMAZON_PRIVATE_AUDIT_PATH="${MKT53_AMAZON_PRIVATE_AUDIT_PATH:-${AMAZON_PRIVATE_DIR}/amazon-commerce-private-input-audit.json}"
PRIVATE_AUDIT_REQUIRED="${MKT53_PRIVATE_AUDIT_REQUIRED:-0}"
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

if [[ ! -d "${HTML_DIR}" ]]; then
  echo "Missing static html directory: ${HTML_DIR}" >&2
  exit 1
fi

REFRESH_LOG="${RUN_LOG_DIR}/refresh.log"
TEST_LOG="${RUN_LOG_DIR}/test.log"
LINT_LOG="${RUN_LOG_DIR}/lint.log"
AUDIT_LOG="${RUN_LOG_DIR}/npm-audit.log"
BUILD_LOG="${RUN_LOG_DIR}/build.log"
PUBLISH_LOG="${RUN_LOG_DIR}/publish-static.log"
REPORT_LOG="${RUN_LOG_DIR}/run-report.log"

cd "${APP_DIR}"

HAS_FAILURE=0

run_step "data refresh" "${REFRESH_LOG}" npm run data:refresh:semi-monthly -- "$@"
REFRESH_STATUS=$?
if [[ ${REFRESH_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

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

run_step "npm test" "${TEST_LOG}" npm run test
TEST_STATUS=$?
if [[ ${TEST_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "npm run lint" "${LINT_LOG}" npm run lint
LINT_STATUS=$?
if [[ ${LINT_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "npm audit" "${AUDIT_LOG}" npm audit
AUDIT_GATE_STATUS=$?
if [[ ${AUDIT_GATE_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "npm run build" "${BUILD_LOG}" npm run build
BUILD_STATUS=$?
if [[ ${BUILD_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "publish static html" "${PUBLISH_LOG}" rsync -az --delete dist/ "${HTML_DIR}/"
PUBLISH_STATUS=$?

if [[ ${PUBLISH_STATUS} -ne 0 ]]; then
  HAS_FAILURE=1
fi

run_step "build semi-monthly run report" "${REPORT_LOG}" npm run data:semi-monthly:report -- --run-id "${RUN_ID}" --source "semi-monthly-local-static" --refresh-log "${REFRESH_LOG}" --deploy-log "${PUBLISH_LOG}" --refresh-status "${REFRESH_STATUS}" --deploy-status "${PUBLISH_STATUS}" --smoke-status "not-run" --e2e-status "not-run" --json

if [[ ${HAS_FAILURE} -ne 0 ]]; then
  echo "Semi-monthly local publish failed. See run log: ${RUN_LOG_DIR}" >&2
  exit 1
fi

echo "Semi-monthly local publish passed. Run report generated."
echo "Published semi-monthly refreshed dist/ to ${HTML_DIR}/"
