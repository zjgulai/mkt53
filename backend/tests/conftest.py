from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from mkt53_backend.config import AppEnvironment, Settings
from mkt53_backend.database import ReadinessResult
from mkt53_backend.main import create_app
from mkt53_backend.models import Base

TEST_PROXY_TOKEN = "test-proxy-token-with-at-least-thirty-two-characters"
TEST_DATABASE_PASSWORD = "test-database-password"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        app_env=AppEnvironment.TEST,
        database_password=SecretStr(TEST_DATABASE_PASSWORD),
        trusted_proxy_token=SecretStr(TEST_PROXY_TOKEN),
    )


@pytest.fixture
def ready_probe():
    return lambda: ReadinessResult(ready=True, database="ready", migration="current")


@pytest.fixture
def session_factory() -> Iterator[sessionmaker[Session]]:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    yield factory
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(settings: Settings, ready_probe, session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    app = create_app(settings=settings, readiness_probe=ready_probe, session_factory=session_factory)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def trusted_headers() -> dict[str, str]:
    return {
        "X-Mkt53-Proxy-Token": TEST_PROXY_TOKEN,
        "X-Portal-Subject": "user:be02-test",
        "X-Portal-Roles": "viewer",
        "X-Request-ID": "be02-test-request-0001",
    }
