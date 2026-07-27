#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

umask 077

DRILL_ID="be07-$(date -u +%Y%m%dt%H%M%Sz)-$$"
PROJECT_NAME="mkt53_${DRILL_ID//-/_}"
SOURCE_DATABASE="mkt53_be07_source"
RESTORE_DATABASE="mkt53_be07_restore"
EDGE_NETWORK="${PROJECT_NAME}_edge"
DATA_NETWORK="${PROJECT_NAME}_data"
POSTGRES_VOLUME="${PROJECT_NAME}_pgdata"
OUTPUT_BASE="$ROOT_DIR/../tmp/backend-recovery/be07"
OUTPUT_DIR="$OUTPUT_BASE/$DRILL_ID"
HELPER="$ROOT_DIR/scripts/recovery_drill_be07.py"
COMPOSE=(docker compose -f "$ROOT_DIR/compose.yaml" -f "$ROOT_DIR/compose.recovery-drill.yaml")

fail() {
  echo "BE-07 recovery drill refused: $*" >&2
  exit 1
}

utc_timestamp() {
  uv run python -c 'from datetime import UTC, datetime; print(datetime.now(UTC).isoformat().replace("+00:00", "Z"))'
}

command -v docker >/dev/null 2>&1 || fail "docker is unavailable"
command -v uv >/dev/null 2>&1 || fail "uv is unavailable"
[[ -f "$HELPER" ]] || fail "recovery helper is missing"
[[ ! -L "$OUTPUT_BASE" ]] || fail "output base must not be a symlink"

DOCKER_CONTEXT=$(docker context show)
DOCKER_ENDPOINT=$(docker context inspect "$DOCKER_CONTEXT" --format '{{(index .Endpoints "docker").Host}}')
case "$DOCKER_ENDPOINT" in
  unix://*|npipe://*) ;;
  *) fail "Docker endpoint must be a local Unix socket or named pipe, got $DOCKER_ENDPOINT" ;;
esac

export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
export MKT53_APP_ENV="test"
export MKT53_APP_VERSION="0.5.0-be07"
export MKT53_DATABASE_NAME="$SOURCE_DATABASE"
export MKT53_DATABASE_USER="mkt53"
export MKT53_EDGE_NETWORK_NAME="$EDGE_NETWORK"
export MKT53_DATA_NETWORK_NAME="$DATA_NETWORK"
export MKT53_POSTGRES_VOLUME_NAME="$POSTGRES_VOLUME"
export MKT53_DATABASE_PASSWORD_FILE="$ROOT_DIR/tests/fixtures/secrets/MKT53_DATABASE_PASSWORD"
export MKT53_TRUSTED_PROXY_TOKEN_FILE="$ROOT_DIR/tests/fixtures/secrets/MKT53_TRUSTED_PROXY_TOKEN"

mkdir -p "$OUTPUT_BASE"
mkdir "$OUTPUT_DIR"

cleanup() {
  "${COMPOSE[@]}" down --volumes --remove-orphans --timeout 20 >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

"${COMPOSE[@]}" config --quiet
if "${COMPOSE[@]}" config --format json | grep -q '"published"'; then
  fail "Compose publishes a host port"
fi
if "${COMPOSE[@]}" config --format json | grep -Eq '"internal"[[:space:]]*:[[:space:]]*false'; then
  fail "recovery drill Compose contains a non-internal network"
fi

STARTED_AT=$(utc_timestamp)
"${COMPOSE[@]}" up --build --wait api

SEED_JSON="$OUTPUT_DIR/seed.json"
MUTATION_JSON="$OUTPUT_DIR/post-backup-mutation.json"
RESTORED_JSON="$OUTPUT_DIR/restore-verification.json"
CLEANUP_JSON="$OUTPUT_DIR/cleanup.json"
BACKUP_FILE="$OUTPUT_DIR/source.pgdump"
REPORT_FILE="$OUTPUT_DIR/report.json"

"${COMPOSE[@]}" exec -T api python - seed < "$HELPER" > "$SEED_JSON"
BASELINE_FINGERPRINT=$(uv run python -c 'import json,sys; print(json.load(open(sys.argv[1]))["fingerprint"]["sha256"])' "$SEED_JSON")

BACKUP_STARTED_AT=$(utc_timestamp)
BACKUP_STARTED_NS=$(uv run python -c 'import time; print(time.monotonic_ns())')
"${COMPOSE[@]}" exec -T postgres \
  pg_dump --username "$MKT53_DATABASE_USER" --dbname "$SOURCE_DATABASE" \
  --format custom --no-owner --no-acl > "$BACKUP_FILE"
BACKUP_COMPLETED_NS=$(uv run python -c 'import time; print(time.monotonic_ns())')
BACKUP_COMPLETED_AT=$(utc_timestamp)
BACKUP_DURATION_SECONDS=$(uv run python -c 'import sys; print((int(sys.argv[2])-int(sys.argv[1]))/1_000_000_000)' \
  "$BACKUP_STARTED_NS" "$BACKUP_COMPLETED_NS")
[[ -s "$BACKUP_FILE" ]] || fail "pg_dump produced an empty archive"
"${COMPOSE[@]}" exec -T postgres pg_restore --list < "$BACKUP_FILE" >/dev/null

"${COMPOSE[@]}" exec -T api python - mutate < "$HELPER" > "$MUTATION_JSON"

RTO_STARTED_NS=$(uv run python -c 'import time; print(time.monotonic_ns())')
"${COMPOSE[@]}" exec -T postgres createdb --username "$MKT53_DATABASE_USER" "$RESTORE_DATABASE"
"${COMPOSE[@]}" exec -T postgres \
  pg_restore --username "$MKT53_DATABASE_USER" --dbname "$RESTORE_DATABASE" \
  --exit-on-error --no-owner --no-acl < "$BACKUP_FILE"
"${COMPOSE[@]}" run --rm --no-deps -T \
  -e MKT53_DATABASE_NAME="$RESTORE_DATABASE" \
  api python - verify "$BASELINE_FINGERPRINT" < "$HELPER" > "$RESTORED_JSON"
RTO_COMPLETED_NS=$(uv run python -c 'import time; print(time.monotonic_ns())')
RTO_SECONDS=$(uv run python -c 'import sys; print((int(sys.argv[2])-int(sys.argv[1]))/1_000_000_000)' \
  "$RTO_STARTED_NS" "$RTO_COMPLETED_NS")

cleanup
trap - EXIT INT TERM

CONTAINERS_REMAINING=$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT_NAME" | wc -l | tr -d ' ')
NETWORKS_REMAINING=0
VOLUMES_REMAINING=0
docker network inspect "$EDGE_NETWORK" >/dev/null 2>&1 && NETWORKS_REMAINING=$((NETWORKS_REMAINING + 1))
docker network inspect "$DATA_NETWORK" >/dev/null 2>&1 && NETWORKS_REMAINING=$((NETWORKS_REMAINING + 1))
docker volume inspect "$POSTGRES_VOLUME" >/dev/null 2>&1 && VOLUMES_REMAINING=$((VOLUMES_REMAINING + 1))
uv run python "$HELPER" cleanup \
  --containers "$CONTAINERS_REMAINING" \
  --networks "$NETWORKS_REMAINING" \
  --volumes "$VOLUMES_REMAINING" > "$CLEANUP_JSON"

COMPLETED_AT=$(utc_timestamp)
uv run python "$HELPER" report \
  --drill-id "$DRILL_ID" \
  --seed "$SEED_JSON" \
  --mutation "$MUTATION_JSON" \
  --restored "$RESTORED_JSON" \
  --cleanup "$CLEANUP_JSON" \
  --backup "$BACKUP_FILE" \
  --started-at "$STARTED_AT" \
  --completed-at "$COMPLETED_AT" \
  --backup-started-at "$BACKUP_STARTED_AT" \
  --backup-completed-at "$BACKUP_COMPLETED_AT" \
  --backup-duration-seconds "$BACKUP_DURATION_SECONDS" \
  --rto-seconds "$RTO_SECONDS" > "$REPORT_FILE"

echo "BE-07 recovery drill passed: $REPORT_FILE"
sed -n '1,260p' "$REPORT_FILE"
