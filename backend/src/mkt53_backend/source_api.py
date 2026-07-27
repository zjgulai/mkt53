from __future__ import annotations

import re
from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from mkt53_backend.auth import Permission, Principal, require_permission
from mkt53_backend.database import get_db_session
from mkt53_backend.schemas import (
    AuditEventResponse,
    SourceCreate,
    SourceListResponse,
    SourceResponse,
    SourceUpdate,
    VerificationStatus,
    WithdrawSourceRequest,
)
from mkt53_backend.source_registry import MutationResult, RegistryError, SourceRegistryService, source_etag

SOURCE_ID_PATTERN = r"^[a-z0-9][a-z0-9._-]{2,127}$"
IDEMPOTENCY_KEY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$")

router = APIRouter(prefix="/api/v1/sources", tags=["sources"])

DatabaseSession = Annotated[Session, Depends(get_db_session)]
SourceReader = Annotated[Principal, Depends(require_permission(Permission.SOURCE_READ))]
SourceWriter = Annotated[Principal, Depends(require_permission(Permission.SOURCE_WRITE))]
SourceId = Annotated[str, Path(pattern=SOURCE_ID_PATTERN)]


def _require_idempotency_key(value: str | None) -> str:
    if value is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="idempotency_key_required")
    if not IDEMPOTENCY_KEY_PATTERN.fullmatch(value):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_idempotency_key")
    return value


def _require_if_match(value: str | None) -> str:
    if value is None:
        raise HTTPException(status_code=status.HTTP_428_PRECONDITION_REQUIRED, detail="if_match_required")
    return value


def _run_mutation(operation: Callable[[], MutationResult], *, location: str | None = None) -> JSONResponse:
    try:
        result = operation()
    except RegistryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    headers = {}
    if result.etag:
        headers["ETag"] = result.etag
    if result.replayed:
        headers["Idempotent-Replayed"] = "true"
    if location:
        headers["Location"] = location
    return JSONResponse(status_code=result.status_code, content=result.body, headers=headers)


@router.get("", response_model=SourceListResponse)
def list_sources(
    session: DatabaseSession,
    principal: SourceReader,
    include_withdrawn: Annotated[bool, Query(alias="includeWithdrawn")] = False,
    module: Annotated[str | None, Query(min_length=1, max_length=128)] = None,
    verification_status: Annotated[VerificationStatus | None, Query(alias="verificationStatus")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SourceListResponse:
    del principal
    return SourceRegistryService(session).list_sources(
        include_withdrawn=include_withdrawn,
        module=module,
        verification_status=verification_status,
        limit=limit,
        offset=offset,
    )


@router.get("/{source_id}", response_model=SourceResponse)
def get_source(
    source_id: SourceId,
    session: DatabaseSession,
    principal: SourceReader,
    response: Response,
) -> SourceResponse:
    del principal
    try:
        source = SourceRegistryService(session).get_source(source_id)
    except RegistryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    response.headers["ETag"] = source_etag(source)
    return SourceResponse.model_validate(source)


@router.post("", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
def create_source(
    payload: SourceCreate,
    session: DatabaseSession,
    principal: SourceWriter,
    request: Request,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JSONResponse:
    key = _require_idempotency_key(idempotency_key)
    return _run_mutation(
        lambda: SourceRegistryService(session).create_source(
            payload,
            actor=principal.subject,
            request_id=request.state.request_id,
            idempotency_key=key,
        ),
        location=f"/api/v1/sources/{payload.id}",
    )


@router.patch("/{source_id}", response_model=SourceResponse)
def update_source(
    source_id: SourceId,
    payload: SourceUpdate,
    session: DatabaseSession,
    principal: SourceWriter,
    request: Request,
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JSONResponse:
    key = _require_idempotency_key(idempotency_key)
    etag = _require_if_match(if_match)
    return _run_mutation(
        lambda: SourceRegistryService(session).update_source(
            source_id,
            payload,
            if_match=etag,
            actor=principal.subject,
            request_id=request.state.request_id,
            idempotency_key=key,
        )
    )


@router.post("/{source_id}/withdraw", response_model=SourceResponse)
def withdraw_source(
    source_id: SourceId,
    payload: WithdrawSourceRequest,
    session: DatabaseSession,
    principal: SourceWriter,
    request: Request,
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JSONResponse:
    key = _require_idempotency_key(idempotency_key)
    etag = _require_if_match(if_match)
    return _run_mutation(
        lambda: SourceRegistryService(session).withdraw_source(
            source_id,
            payload.reason,
            if_match=etag,
            actor=principal.subject,
            request_id=request.state.request_id,
            idempotency_key=key,
        )
    )


@router.get("/{source_id}/audit", response_model=list[AuditEventResponse])
def list_source_audit(
    source_id: SourceId,
    session: DatabaseSession,
    principal: SourceReader,
) -> list[AuditEventResponse]:
    del principal
    try:
        return SourceRegistryService(session).list_audit_events(source_id)
    except RegistryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
