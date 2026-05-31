#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mkt.lute-tlz-dddd.top}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

routes=(
  "/"
  "/market/trend"
  "/industry/regulation"
  "/ai-assistant/design"
)

for route in "${routes[@]}"; do
  status_code="$(curl -sS -o "${TMP_DIR}/page.html" -w "%{http_code}" "${BASE_URL}${route}")"
  if [[ "${status_code}" != "200" ]]; then
    echo "Route smoke failed: ${BASE_URL}${route} returned ${status_code}" >&2
    exit 1
  fi
done

curl -fsSL "${BASE_URL}/" -o "${TMP_DIR}/index.html"
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
  curl -fsSL "${BASE_URL}${asset}" -o "${asset_path}"
  if grep -Eq 'sk-[A-Za-z0-9]{30,}|ghp_[A-Za-z0-9_]{30,}|Authorization:[[:space:]]*Bearer|code-path=|react-simple-maps|2026-08452' "${asset_path}"; then
    echo "Sensitive or removed dependency marker found in ${asset}" >&2
    exit 1
  fi
done

curl -fsSI "${BASE_URL}/images/world-map.jpg" >/dev/null

echo "Smoke passed: ${BASE_URL}"
