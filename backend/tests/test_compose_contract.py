from __future__ import annotations

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def load_compose() -> dict:
    return yaml.safe_load((ROOT / "compose.yaml").read_text(encoding="utf-8"))


def test_compose_has_no_host_or_public_ports() -> None:
    compose = load_compose()
    assert all("ports" not in service for service in compose["services"].values())


def test_api_and_postgres_have_separate_network_boundaries() -> None:
    compose = load_compose()
    assert set(compose["services"]["api"]["networks"]) == {"edge", "data"}
    assert compose["services"]["postgres"]["networks"] == ["data"]
    assert compose["services"]["migrate"]["networks"] == ["data"]
    assert compose["networks"]["data"]["internal"] is True
    assert compose["networks"]["edge"].get("internal") is not True


def test_images_are_digest_pinned_and_not_latest() -> None:
    compose_text = (ROOT / "compose.yaml").read_text(encoding="utf-8")
    dockerfile_text = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert "postgres:17.10-bookworm@sha256:" in compose_text
    assert "python:3.12.13-slim-bookworm@sha256:" in dockerfile_text
    assert ":latest" not in compose_text
    assert ":latest" not in dockerfile_text
    assert "mkt53-api:be07-local" in compose_text


def test_recovery_drill_override_makes_every_network_internal_and_disables_restarts() -> None:
    override = yaml.safe_load((ROOT / "compose.recovery-drill.yaml").read_text(encoding="utf-8"))
    assert override["networks"]["edge"]["internal"] is True
    assert override["services"]["postgres"]["restart"] == "no"
    assert override["services"]["api"]["restart"] == "no"


def test_secrets_are_file_mounted_and_fixture_values_are_explicitly_nonproduction() -> None:
    compose = load_compose()
    postgres_env = compose["services"]["postgres"]["environment"]
    api_env = compose["services"]["api"]["environment"]
    assert postgres_env["POSTGRES_PASSWORD_FILE"] == "/run/secrets/MKT53_DATABASE_PASSWORD"
    assert "MKT53_DATABASE_PASSWORD" not in api_env
    assert "MKT53_TRUSTED_PROXY_TOKEN" not in api_env

    database_fixture = (ROOT / "tests/fixtures/secrets/MKT53_DATABASE_PASSWORD").read_text(encoding="utf-8")
    proxy_fixture = (ROOT / "tests/fixtures/secrets/MKT53_TRUSTED_PROXY_TOKEN").read_text(encoding="utf-8")
    assert database_fixture.strip().startswith("fixture-only-")
    assert proxy_fixture.strip().startswith("fixture-only-")


def test_api_container_is_read_only_and_drops_capabilities() -> None:
    api = load_compose()["services"]["api"]
    assert api["read_only"] is True
    assert api["cap_drop"] == ["ALL"]
    assert "no-new-privileges:true" in api["security_opt"]
