from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Protocol

from fastapi import Request
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from mkt53_backend.config import Settings

EXPECTED_ALEMBIC_REVISION = "0004_be05_review_state_machine"


@dataclass(frozen=True)
class ReadinessResult:
    ready: bool
    database: str
    migration: str
    reason: str | None = None


class ReadinessProbe(Protocol):
    def __call__(self) -> ReadinessResult: ...


class DatabaseReadinessProbe:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def __call__(self) -> ReadinessResult:
        engine = create_engine(
            self._settings.database_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": self._settings.database_connect_timeout_seconds},
        )
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
                revision = connection.execute(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                ).scalar_one_or_none()
            if revision != EXPECTED_ALEMBIC_REVISION:
                return ReadinessResult(
                    ready=False,
                    database="ready",
                    migration="stale",
                    reason="database migration revision does not match the application contract",
                )
            return ReadinessResult(ready=True, database="ready", migration="current")
        except SQLAlchemyError as exc:
            return ReadinessResult(
                ready=False,
                database="unavailable",
                migration="unknown",
                reason=exc.__class__.__name__,
            )
        finally:
            engine.dispose()


class DatabaseSessionManager:
    def __init__(self, settings: Settings) -> None:
        self.engine: Engine = create_engine(settings.database_url, pool_pre_ping=True)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)

    def dispose(self) -> None:
        self.engine.dispose()


def get_db_session(request: Request) -> Iterator[Session]:
    session_factory: sessionmaker[Session] = request.app.state.session_factory
    with session_factory() as session:
        yield session
