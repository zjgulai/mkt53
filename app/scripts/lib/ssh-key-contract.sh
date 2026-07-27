#!/usr/bin/env bash

mkt53_resolve_ssh_key_path() {
  local repo_root="$1"
  printf '%s' "${MKT53_SSH_KEY_PATH:-${KEY_PATH:-${repo_root}/DDDD.pem}}"
}

mkt53_require_ssh_key() {
  local key_path="$1"
  local purpose="${2:-production operation}"

  if [[ ! -f "${key_path}" ]]; then
    echo "Missing SSH key for ${purpose}: ${key_path}" >&2
    echo "Set MKT53_SSH_KEY_PATH to an explicit private-key path when the repository default is unavailable." >&2
    return 1
  fi

  if [[ ! -r "${key_path}" ]]; then
    echo "SSH key is not readable for ${purpose}: ${key_path}" >&2
    return 1
  fi
}
