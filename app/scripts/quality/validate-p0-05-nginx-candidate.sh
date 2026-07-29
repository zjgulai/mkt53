#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CANDIDATE="$APP_ROOT/configs/nginx/mkt53-portal-gate.candidate.conf"
FIXTURE_ROOT="$APP_ROOT/tests/fixtures/nginx/p0-05"
DOCKER_IMAGE="${MKT53_P0_05_NGINX_IMAGE:-nginx:1.29.8-alpine}"
PRODUCTION_HOST="mkt.lute-tlz-dddd.top"
RUN_SUFFIX="$$"
NETWORK_NAME="mkt53-p0-05-$RUN_SUFFIX"
AUTH_CONTAINER="mkt53-p0-05-auth-$RUN_SUFFIX"
GATE_CONTAINER="mkt53-p0-05-gate-$RUN_SUFFIX"
TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/mkt53-p0-05-nginx.XXXXXX")"

cleanup() {
  docker rm -f "$GATE_CONTAINER" "$AUTH_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true

  case "$TEMP_ROOT" in
    "${TMPDIR:-/tmp}"/mkt53-p0-05-nginx.*) rm -rf -- "$TEMP_ROOT" ;;
  esac
}
trap cleanup EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

request() {
  local path="$1"
  local cookie="${2:-}"
  local name="$3"
  local headers="$TEMP_ROOT/$name.headers"
  local body="$TEMP_ROOT/$name.body"
  local args=(-k -sS --resolve "$PRODUCTION_HOST:$HOST_PORT:127.0.0.1" -D "$headers" -o "$body" -w '%{http_code}')

  if [[ -n "$cookie" ]]; then
    args+=(--cookie "$cookie")
  fi

  HTTP_STATUS="$(curl "${args[@]}" "https://$PRODUCTION_HOST:$HOST_PORT$path")"
  HTTP_LOCATION="$(awk 'tolower($1) == "location:" { $1=""; sub(/^[[:space:]]*/, ""); sub(/\r$/, ""); print }' "$headers")"
  HTTP_CACHE_CONTROL="$(awk 'tolower($1) == "cache-control:" { $1=""; sub(/^[[:space:]]*/, ""); sub(/\r$/, ""); print }' "$headers")"
  HTTP_BODY="$body"
}

assert_redirect() {
  local path="$1"
  local name="$2"
  local expected="https://lute-tlz-dddd.top/login.html?next=https://$PRODUCTION_HOST$path"

  request "$path" "" "$name"
  [[ "$HTTP_STATUS" == "302" ]] || { echo "$path expected 302, got $HTTP_STATUS" >&2; exit 1; }
  [[ "$HTTP_LOCATION" == "$expected" ]] || { echo "$path unexpected Location: $HTTP_LOCATION" >&2; exit 1; }
}

for command_name in docker curl openssl awk grep; do
  require_command "$command_name"
done

[[ -f "$CANDIDATE" ]] || { echo "Candidate not found: $CANDIDATE" >&2; exit 1; }
[[ -f "$FIXTURE_ROOT/mock-auth.nginx.conf" ]] || { echo "Mock auth fixture missing" >&2; exit 1; }

mkdir -p "$TEMP_ROOT/certs"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -subj "/CN=$PRODUCTION_HOST" \
  -keyout "$TEMP_ROOT/certs/privkey.pem" \
  -out "$TEMP_ROOT/certs/fullchain.pem" >/dev/null 2>&1

docker image inspect "$DOCKER_IMAGE" >/dev/null 2>&1 || docker pull "$DOCKER_IMAGE" >/dev/null
docker network create "$NETWORK_NAME" >/dev/null

docker run -d --name "$AUTH_CONTAINER" \
  --network "$NETWORK_NAME" \
  --network-alias portal_auth \
  -v "$FIXTURE_ROOT/mock-auth.nginx.conf:/etc/nginx/nginx.conf:ro" \
  "$DOCKER_IMAGE" >/dev/null

docker run -d --name "$GATE_CONTAINER" \
  --network "$NETWORK_NAME" \
  -p 127.0.0.1::443 \
  -v "$FIXTURE_ROOT/test-harness.nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$CANDIDATE:/etc/nginx/conf.d/mkt53-portal-gate.candidate.conf:ro" \
  -v "$FIXTURE_ROOT/www:/var/www/mkt53:ro" \
  -v "$TEMP_ROOT/certs:/etc/letsencrypt/live/lute-tlz-dddd.top:ro" \
  "$DOCKER_IMAGE" >/dev/null

HOST_PORT="$(docker inspect "$GATE_CONTAINER" --format '{{(index (index .NetworkSettings.Ports "443/tcp") 0).HostPort}}')"

for _ in $(seq 1 30); do
  if curl -k -sS --resolve "$PRODUCTION_HOST:$HOST_PORT:127.0.0.1" \
    "https://$PRODUCTION_HOST:$HOST_PORT/_portal_auth" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

docker exec "$GATE_CONTAINER" nginx -t >/dev/null

assert_redirect "/" "root-unauthorized"
assert_redirect "/market/trend" "deep-route-unauthorized"
assert_redirect "/periodic-data/latest.json" "manifest-unauthorized"

request "/" "portal_session=valid" "root-authorized"
[[ "$HTTP_STATUS" == "200" ]] || { echo "Authorized root expected 200, got $HTTP_STATUS" >&2; exit 1; }
grep -Fq "mkt53-p0-05-authorized-candidate" "$HTTP_BODY"
[[ "$HTTP_CACHE_CONTROL" == "private, no-store" ]] || { echo "Authorized root missing private cache policy" >&2; exit 1; }

request "/periodic-data/latest.json" "portal_session=valid" "manifest-authorized"
[[ "$HTTP_STATUS" == "200" ]] || { echo "Authorized manifest expected 200, got $HTTP_STATUS" >&2; exit 1; }
grep -Fq '"period":"2026-07-H2"' "$HTTP_BODY"

request "/_portal_auth" "portal_session=valid" "internal-auth-direct"
[[ "$HTTP_STATUS" == "404" ]] || { echo "Internal auth endpoint expected 404, got $HTTP_STATUS" >&2; exit 1; }

cat <<JSON
{
  "schemaVersion": 1,
  "status": "passed",
  "evidenceLayer": "L2-isolated-docker-fixture",
  "productionWrites": false,
  "dockerImage": "$DOCKER_IMAGE",
  "candidateSha256": "$(sha256_file "$CANDIDATE")",
  "checks": {
    "nginxSyntax": "passed",
    "unauthorizedRootRedirect": "302",
    "unauthorizedDeepRouteRedirect": "302",
    "unauthorizedManifestRedirect": "302",
    "authorizedRoot": "200-synthetic-session",
    "authorizedManifest": "200-synthetic-session",
    "internalAuthDirectAccess": "404",
    "cachePolicy": "private-no-store"
  }
}
JSON
