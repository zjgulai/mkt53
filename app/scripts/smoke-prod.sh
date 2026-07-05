#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mkt.lute-tlz-dddd.top}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/.." && pwd)"
KEY_PATH="${KEY_PATH:-${REPO_ROOT}/ai_video.pem}"
REMOTE="${REMOTE:-ubuntu@101.34.52.232}"
REMOTE_PATH="${REMOTE_PATH:-/opt/mkt53/html/}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

protected_route_count=0

routes=(
  "/"
  "/market/trend"
  "/industry/regulation"
  "/ai-assistant/design"
)

remote_static_path() {
  local relative_path="$1"
  printf '%s/%s' "${REMOTE_PATH%/}" "${relative_path#/}"
}

remote_cat() {
  local relative_path="$1"
  local remote_file
  remote_file="$(remote_static_path "${relative_path}")"
  ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE}" "cat '${remote_file}'"
}

assert_remote_file() {
  local relative_path="$1"
  local remote_file
  remote_file="$(remote_static_path "${relative_path}")"
  ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE}" "test -s '${remote_file}'"
}

for route in "${routes[@]}"; do
  headers_path="${TMP_DIR}/headers-${route//\//_}.txt"
  status_code="$(curl -sS -o "${TMP_DIR}/page.html" -D "${headers_path}" -w "%{http_code}" "${BASE_URL}${route}")"
  if [[ "${status_code}" == "200" ]]; then
    continue
  fi

  if [[ "${status_code}" == "302" ]] && grep -Eiq '^location:[[:space:]]*https://lute-tlz-dddd.top/login.html\?next=https://mkt\.lute-tlz-dddd\.top' "${headers_path}"; then
    protected_route_count=$((protected_route_count + 1))
    continue
  fi

    echo "Route smoke failed: ${BASE_URL}${route} returned ${status_code}" >&2
    exit 1
done

if [[ "${protected_route_count}" -gt 0 ]]; then
  if [[ ! -f "${KEY_PATH}" ]]; then
    echo "Missing SSH key for auth-protected production static check: ${KEY_PATH}" >&2
    exit 1
  fi

  remote_cat "index.html" > "${TMP_DIR}/index.html"
  remote_cat "periodic-data/latest.json" > "${TMP_DIR}/periodic-latest.json"
  remote_cat "periodic-data/public-evidence-samples.json" > "${TMP_DIR}/public-evidence-samples.json"

  node -e "const fs=require('fs'); const latest=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const evidence=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); if (latest.refreshCadence !== 'semi-monthly') throw new Error('unexpected refreshCadence'); if (!/^\\d{4}-\\d{2}-H[12]$/.test(latest.period)) throw new Error('unexpected period'); if (evidence.summary?.businessDataWrites !== 0) throw new Error('public evidence wrote business data');" "${TMP_DIR}/periodic-latest.json" "${TMP_DIR}/public-evidence-samples.json"
else
  curl -fsSL "${BASE_URL}/" -o "${TMP_DIR}/index.html"
fi

assets=()
while IFS= read -r asset; do
  assets+=("${asset}")
done < <(
  grep -oE '(src|href)="/assets/[^"]+\.js"' "${TMP_DIR}/index.html" \
    | sed -E 's/^(src|href)="([^"]+)"/\2/' \
    | sort -u
)

if [[ "${#assets[@]}" -eq 0 ]]; then
  echo "No JavaScript assets found in production index" >&2
  exit 1
fi

for asset in "${assets[@]}"; do
  asset_path="${TMP_DIR}/$(basename "${asset}")"
  if [[ "${protected_route_count}" -gt 0 ]]; then
    remote_cat "${asset}" > "${asset_path}"
  else
    curl -fsSL "${BASE_URL}${asset}" -o "${asset_path}"
  fi
  if grep -Eq 'sk-[A-Za-z0-9]{30,}|ghp_[A-Za-z0-9_]{30,}|Authorization:[[:space:]]*Bearer|code-path=|react-simple-maps|2026-08452' "${asset_path}"; then
    echo "Sensitive or removed dependency marker found in ${asset}" >&2
    exit 1
  fi
done

if [[ "${protected_route_count}" -gt 0 ]]; then
  assert_remote_file "images/world-map.jpg"
else
  curl -fsSI "${BASE_URL}/images/world-map.jpg" >/dev/null
fi

if [[ "${protected_route_count}" -gt 0 ]]; then
  echo "Smoke passed: ${BASE_URL} auth-gated; remote static files verified"
else
  echo "Smoke passed: ${BASE_URL}"
fi
