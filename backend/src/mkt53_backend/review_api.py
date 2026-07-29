from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from mkt53_backend.auth import Permission, Principal, require_permission
from mkt53_backend.database import get_db_session
from mkt53_backend.review_registry import ReviewError, ReviewRegistryService, review_etag
from mkt53_backend.schemas import (
    ReviewEntityType,
    ReviewEventResponse,
    ReviewListResponse,
    ReviewResponse,
    ReviewState,
    ReviewTransitionRequest,
)

ENTITY_ID_PATTERN = r"^[a-z0-9][a-z0-9._-]{2,127}$"
IDEMPOTENCY_KEY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$")

router = APIRouter(prefix="/api/v1/reviews", tags=["reviews"])

DatabaseSession = Annotated[Session, Depends(get_db_session)]
ReviewReader = Annotated[Principal, Depends(require_permission(Permission.REVIEW_READ))]
ReviewWriter = Annotated[Principal, Depends(require_permission(Permission.REVIEW_WRITE))]
EntityId = Annotated[str, Path(pattern=ENTITY_ID_PATTERN)]


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


@router.get("", response_model=ReviewListResponse)
def list_reviews(
    session: DatabaseSession,
    principal: ReviewReader,
    entity_type: Annotated[ReviewEntityType | None, Query(alias="entityType")] = None,
    state_filter: Annotated[ReviewState | None, Query(alias="state")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ReviewListResponse:
    del principal
    return ReviewRegistryService(session).list_reviews(
        entity_type=entity_type.value if entity_type else None,
        state=state_filter.value if state_filter else None,
        limit=limit,
        offset=offset,
    )


@router.get("/{entity_type}/{entity_id}", response_model=ReviewResponse)
def get_review(
    entity_type: ReviewEntityType,
    entity_id: EntityId,
    session: DatabaseSession,
    principal: ReviewReader,
    response: Response,
) -> ReviewResponse:
    del principal
    try:
        review = ReviewRegistryService(session).get_review(entity_type.value, entity_id)
    except ReviewError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    response.headers["ETag"] = review_etag(review)
    return ReviewResponse.model_validate(review)


@router.post("/{entity_type}/{entity_id}/transitions", response_model=ReviewResponse)
def transition_review(
    entity_type: ReviewEntityType,
    entity_id: EntityId,
    payload: ReviewTransitionRequest,
    session: DatabaseSession,
    principal: ReviewWriter,
    request: Request,
    if_match: Annotated[str | None, Header(alias="If-Match")] = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JSONResponse:
    key = _require_idempotency_key(idempotency_key)
    etag = _require_if_match(if_match)
    try:
        result = ReviewRegistryService(session).transition(
            entity_type.value,
            entity_id,
            payload,
            if_match=etag,
            actor=principal.subject,
            request_id=request.state.request_id,
            idempotency_key=key,
        )
    except ReviewError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    headers = {"ETag": result.etag}
    if result.replayed:
        headers["Idempotent-Replayed"] = "true"
    return JSONResponse(status_code=result.status_code, content=result.body, headers=headers)


@router.get("/{entity_type}/{entity_id}/events", response_model=list[ReviewEventResponse])
def list_review_events(
    entity_type: ReviewEntityType,
    entity_id: EntityId,
    session: DatabaseSession,
    principal: ReviewReader,
) -> list[ReviewEventResponse]:
    del principal
    try:
        return ReviewRegistryService(session).list_events(entity_type.value, entity_id)
    except ReviewError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
