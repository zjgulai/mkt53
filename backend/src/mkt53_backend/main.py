from __future__ import annotations

import re
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, sessionmaker

from mkt53_backend.auth import Permission, Principal, require_permission
from mkt53_backend.config import AppEnvironment, Settings, get_settings
from mkt53_backend.database import DatabaseReadinessProbe, DatabaseSessionManager, ReadinessProbe, ReadinessResult
from mkt53_backend.review_api import router as review_router
from mkt53_backend.snapshot_api import router as snapshot_router
from mkt53_backend.source_api import router as source_router

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$")


class LiveResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: AppEnvironment
    started_at: datetime


class ReadyResponse(BaseModel):
    status: str
    database: str
    migration: str


class PublicHealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: AppEnvironment


class PrincipalResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    subject: str
    roles: list[str]
    permissions: list[str]


class WriteProbeResponse(BaseModel):
    authorized: bool
    side_effects: bool
    actor: str


def _redacted_readiness(result: ReadinessResult) -> ReadyResponse:
    return ReadyResponse(
        status="ready" if result.ready else "not-ready",
        database=result.database,
        migration=result.migration,
    )


def create_app(
    settings: Settings | None = None,
    readiness_probe: ReadinessProbe | None = None,
    session_factory: sessionmaker[Session] | None = None,
) -> FastAPI:
    active_settings = settings or get_settings()
    docs_enabled = active_settings.openapi_enabled
    started_at = datetime.now(UTC)
    session_manager = DatabaseSessionManager(active_settings) if session_factory is None else None
    active_session_factory = session_factory or session_manager.session_factory

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.started_at = started_at
        try:
            yield
        finally:
            if session_manager is not None:
                session_manager.dispose()

    app = FastAPI(
        title="mkt53 Backend API",
        version=active_settings.app_version,
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
        lifespan=lifespan,
    )
    app.state.settings = active_settings
    app.state.readiness_probe = readiness_probe or DatabaseReadinessProbe(active_settings)
    app.state.session_factory = active_session_factory

    if active_settings.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(active_settings.allowed_origins),
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
            allow_headers=["Content-Type", "If-Match", "Idempotency-Key", "X-Request-ID"],
        )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        candidate = request.headers.get("X-Request-ID", "")
        request_id = candidate if REQUEST_ID_PATTERN.fullmatch(candidate) else str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["Cache-Control"] = "private, no-store"
        return response

    @app.get("/internal/health/live", response_model=LiveResponse, include_in_schema=False)
    def internal_live(request: Request) -> LiveResponse:
        return LiveResponse(
            status="live",
            service="mkt53-api",
            version=active_settings.app_version,
            environment=active_settings.app_env,
            started_at=request.app.state.started_at,
        )

    @app.get(
        "/internal/health/ready",
        response_model=ReadyResponse,
        responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadyResponse}},
        include_in_schema=False,
    )
    def internal_ready(request: Request) -> ReadyResponse | JSONResponse:
        result: ReadinessResult = request.app.state.readiness_probe()
        payload = _redacted_readiness(result)
        if not result.ready:
            return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload.model_dump())
        return payload

    @app.get("/api/v1/health", response_model=PublicHealthResponse)
    def public_health(
        request: Request,
        principal: Annotated[Principal, Depends(require_permission(Permission.HEALTH_READ))],
    ) -> PublicHealthResponse | JSONResponse:
        del principal
        result: ReadinessResult = request.app.state.readiness_probe()
        payload = PublicHealthResponse(
            status="ready" if result.ready else "not-ready",
            service="mkt53-api",
            version=active_settings.app_version,
            environment=active_settings.app_env,
        )
        if not result.ready:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload.model_dump(mode="json")
            )
        return payload

    @app.get("/api/v1/authz/me", response_model=PrincipalResponse)
    def authz_me(
        principal: Annotated[Principal, Depends(require_permission(Permission.HEALTH_READ))],
    ) -> PrincipalResponse:
        return PrincipalResponse(
            subject=principal.subject,
            roles=sorted(role.value for role in principal.roles),
            permissions=sorted(permission.value for permission in principal.permissions),
        )

    @app.post("/api/v1/authz/write-probe", response_model=WriteProbeResponse)
    def authz_write_probe(
        principal: Annotated[Principal, Depends(require_permission(Permission.REVIEW_WRITE))],
        response: Response,
    ) -> WriteProbeResponse:
        response.status_code = status.HTTP_200_OK
        return WriteProbeResponse(authorized=True, side_effects=False, actor=principal.subject)

    app.include_router(source_router)
    app.include_router(snapshot_router)
    app.include_router(review_router)

    return app


app = create_app()
