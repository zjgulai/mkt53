from __future__ import annotations

import re
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from mkt53_backend.auth import Permission, Principal, require_permission
from mkt53_backend.database import get_db_session
from mkt53_backend.schemas import AuditEventResponse, SnapshotCreate, SnapshotListResponse, SnapshotResponse
from mkt53_backend.snapshot_registry import SnapshotRegistryService, snapshot_etag
from mkt53_backend.source_registry import RegistryError

SNAPSHOT_ID_PATTERN = r"^snap-[a-z0-9][a-z0-9._-]{2,122}$"
SOURCE_ID_PATTERN = r"^[a-z0-9][a-z0-9._-]{2,127}$"
IDEMPOTENCY_KEY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$")

router = APIRouter(prefix="/api/v1/snapshots", tags=["snapshots"])

DatabaseSession = Annotated[Session, Depends(get_db_session)]
SnapshotReader = Annotated[Principal, Depends(require_permission(Permission.SNAPSHOT_READ))]
SnapshotWriter = Annotated[Principal, Depends(require_permission(Permission.SNAPSHOT_WRITE))]
SnapshotId = Annotated[str, Path(pattern=SNAPSHOT_ID_PATTERN)]


def _require_idempotency_key(value: str | None) -> str:
    if value is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="idempotency_key_required")
    if not IDEMPOTENCY_KEY_PATTERN.fullmatch(value):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_idempotency_key")
    return value


@router.get("", response_model=SnapshotListResponse)
def list_snapshots(
    session: DatabaseSession,
    principal: SnapshotReader,
    source_id: Annotated[str | None, Query(alias="sourceId", pattern=SOURCE_ID_PATTERN)] = None,
    schema_version: Annotated[
        str | None,
        Query(alias="schemaVersion", pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$"),
    ] = None,
    window_start: Annotated[date | None, Query(alias="windowStart")] = None,
    window_end: Annotated[date | None, Query(alias="windowEnd")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> SnapshotListResponse:
    del principal
    if window_start and window_end and window_start > window_end:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_window_filter")
    return SnapshotRegistryService(session).list_snapshots(
        source_id=source_id,
        schema_version=schema_version,
        window_start=window_start,
        window_end=window_end,
        limit=limit,
        offset=offset,
    )


@router.get("/{snapshot_id}", response_model=SnapshotResponse)
def get_snapshot(
    snapshot_id: SnapshotId,
    session: DatabaseSession,
    principal: SnapshotReader,
    response: Response,
) -> SnapshotResponse:
    del principal
    try:
        snapshot = SnapshotRegistryService(session).get_snapshot(snapshot_id)
    except RegistryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    response.headers["ETag"] = snapshot_etag(snapshot)
    return SnapshotResponse.model_validate(snapshot)


@router.post(
    "",
    response_model=SnapshotResponse,
    status_code=status.HTTP_201_CREATED,
    responses={status.HTTP_200_OK: {"model": SnapshotResponse, "description": "Exact duplicate replay"}},
)
def create_snapshot(
    payload: SnapshotCreate,
    session: DatabaseSession,
    principal: SnapshotWriter,
    request: Request,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JSONResponse:
    key = _require_idempotency_key(idempotency_key)
    try:
        result = SnapshotRegistryService(session).create_snapshot(
            payload,
            actor=principal.subject,
            request_id=request.state.request_id,
            idempotency_key=key,
        )
    except RegistryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    headers = {
        "Location": f"/api/v1/snapshots/{result.body['id']}",
    }
    if result.etag:
        headers["ETag"] = result.etag
    if result.replayed:
        headers["Idempotent-Replayed"] = "true"
    return JSONResponse(status_code=result.status_code, content=result.body, headers=headers)


@router.get("/{snapshot_id}/audit", response_model=list[AuditEventResponse])
def list_snapshot_audit(
    snapshot_id: SnapshotId,
    session: DatabaseSession,
    principal: SnapshotReader,
) -> list[AuditEventResponse]:
    del principal
    try:
        return SnapshotRegistryService(session).list_audit_events(snapshot_id)
    except RegistryError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
