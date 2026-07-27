from __future__ import annotations

from fastapi.testclient import TestClient
from pydantic import SecretStr

from mkt53_backend.config import AppEnvironment, Settings
from mkt53_backend.database import ReadinessResult
from mkt53_backend.main import create_app
from tests.test_config import PRODUCTION_DATABASE_PASSWORD, PRODUCTION_PROXY_TOKEN


def test_production_disables_docs_redoc_and_openapi() -> None:
    settings = Settings(
        app_env=AppEnvironment.PRODUCTION,
        database_password=SecretStr(PRODUCTION_DATABASE_PASSWORD),
        trusted_proxy_token=SecretStr(PRODUCTION_PROXY_TOKEN),
    )

    def probe() -> ReadinessResult:
        return ReadinessResult(ready=True, database="ready", migration="current")

    with TestClient(create_app(settings=settings, readiness_probe=probe)) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/redoc").status_code == 404
        assert client.get("/openapi.json").status_code == 404


def test_development_exposes_openapi_for_local_work(settings: Settings, ready_probe) -> None:
    with TestClient(create_app(settings=settings, readiness_probe=ready_probe)) as client:
        response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "/api/v1/authz/write-probe" in response.json()["paths"]
    assert "/api/v1/sources" in response.json()["paths"]
    assert "/api/v1/sources/{source_id}" in response.json()["paths"]
    assert "/api/v1/sources/{source_id}/withdraw" in response.json()["paths"]
    assert "/api/v1/sources/{source_id}/audit" in response.json()["paths"]
    assert "/api/v1/snapshots" in response.json()["paths"]
    assert "/api/v1/snapshots/{snapshot_id}" in response.json()["paths"]
    assert "/api/v1/snapshots/{snapshot_id}/audit" in response.json()["paths"]
    assert "patch" not in response.json()["paths"]["/api/v1/snapshots/{snapshot_id}"]
    assert "/api/v1/reviews" in response.json()["paths"]
    assert "/api/v1/reviews/{entity_type}/{entity_id}" in response.json()["paths"]
    assert "/api/v1/reviews/{entity_type}/{entity_id}/transitions" in response.json()["paths"]
    assert "/api/v1/reviews/{entity_type}/{entity_id}/events" in response.json()["paths"]
