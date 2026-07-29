#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

uv lock --check
uv run ruff format --check .
uv run ruff check .
uv run pytest --cov=mkt53_backend --cov-report=term-missing
docker compose config --quiet

if docker compose config --format json | grep -q '"published"'; then
  echo "BE-02 quality gate failed: Compose publishes a host port." >&2
  exit 1
fi

echo "BE-02 quality gate passed: lock, format, lint, tests, coverage, compose, and no published ports."
