from __future__ import annotations

from fastapi.testclient import TestClient

from mkt53_backend.config import Settings
from mkt53_backend.database import ReadinessResult
from mkt53_backend.main import create_app


def test_internal_live_does_not_call_database(
    settings: Settings,
) -> None:
    def unexpected_probe() -> ReadinessResult:
        raise AssertionError("liveness must not call database readiness")

    with TestClient(create_app(settings=settings, readiness_probe=unexpected_probe)) as client:
        response = client.get("/internal/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "live"
    assert response.json()["environment"] == "test"
    assert response.headers["Cache-Control"] == "private, no-store"


def test_internal_ready_returns_redacted_success(client: TestClient) -> None:
    response = client.get("/internal/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ready", "migration": "current"}


def test_internal_ready_redacts_probe_reason(settings: Settings) -> None:
    def probe() -> ReadinessResult:
        return ReadinessResult(
            ready=False,
            database="unavailable",
            migration="unknown",
            reason="password=must-not-leak host=private-db",
        )

    with TestClient(create_app(settings=settings, readiness_probe=probe)) as client:
        response = client.get("/internal/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "not-ready", "database": "unavailable", "migration": "unknown"}
    assert "password" not in response.text


def test_public_health_requires_identity(client: TestClient, trusted_headers: dict[str, str]) -> None:
    assert client.get("/api/v1/health").status_code == 401
    response = client.get("/api/v1/health", headers=trusted_headers)
    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "service": "mkt53-api",
        "version": "0.5.0-be07",
        "environment": "test",
    }


def test_public_health_returns_redacted_not_ready(settings: Settings, trusted_headers: dict[str, str]) -> None:
    def probe() -> ReadinessResult:
        return ReadinessResult(
            ready=False,
            database="unavailable",
            migration="unknown",
            reason="private database detail",
        )

    with TestClient(create_app(settings=settings, readiness_probe=probe)) as client:
        response = client.get("/api/v1/health", headers=trusted_headers)

    assert response.status_code == 503
    assert response.json()["status"] == "not-ready"
    assert "private database detail" not in response.text


def test_request_id_is_preserved_only_when_valid(client: TestClient) -> None:
    valid = client.get("/internal/health/live", headers={"X-Request-ID": "request-valid-0001"})
    assert valid.headers["X-Request-ID"] == "request-valid-0001"

    generated = client.get("/internal/health/live", headers={"X-Request-ID": "bad id"})
    assert generated.headers["X-Request-ID"] != "bad id"
    assert len(generated.headers["X-Request-ID"]) == 36
