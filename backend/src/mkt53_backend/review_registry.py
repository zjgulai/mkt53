from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from mkt53_backend.models import IdempotencyRecord, ReviewEvent, ReviewSubject, Snapshot, Source, utc_now
from mkt53_backend.schemas import (
    ReviewEventResponse,
    ReviewListResponse,
    ReviewResponse,
    ReviewTransitionRequest,
)

ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "pending": frozenset({"approved", "rejected", "withdrawn"}),
    "approved": frozenset({"withdrawn"}),
    "rejected": frozenset({"withdrawn"}),
    "withdrawn": frozenset(),
}


class ReviewError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@dataclass(frozen=True)
class ReviewMutationResult:
    status_code: int
    body: dict[str, Any]
    etag: str
    replayed: bool = False


def _canonical_request_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def review_etag(review: ReviewSubject) -> str:
    return f'"review:{review.entity_type}:{review.entity_id}:v{review.version}"'


def _review_body(review: ReviewSubject) -> dict[str, Any]:
    return ReviewResponse.model_validate(review).model_dump(mode="json", by_alias=True)


def open_review(
    session: Session,
    *,
    entity_type: str,
    entity_id: str,
    actor: str,
    request_id: str,
    idempotency_key: str,
) -> ReviewSubject:
    now = utc_now()
    review = ReviewSubject(
        entity_type=entity_type,
        entity_id=entity_id,
        state="pending",
        created_at=now,
        updated_at=now,
    )
    session.add(review)
    session.flush()
    session.add(
        ReviewEvent(
            review_subject_id=review.id,
            entity_type=entity_type,
            entity_id=entity_id,
            from_state=None,
            to_state="pending",
            actor=actor,
            reason=f"Review opened when {entity_type} was created.",
            request_id=request_id,
            idempotency_key=idempotency_key,
            occurred_at=now,
        )
    )
    return review


def reopen_review(
    session: Session,
    *,
    entity_type: str,
    entity_id: str,
    actor: str,
    request_id: str,
    idempotency_key: str,
) -> bool:
    review = _get_review_subject(session, entity_type, entity_id)
    if review.state == "pending":
        # Invalidate a review ETag that may already be held by a reviewer when
        # the linked entity changes, even though the state remains pending.
        review.updated_at = utc_now()
        return False
    _record_linked_transition(
        session,
        review=review,
        target_state="pending",
        actor=actor,
        reason=f"Review reopened because {entity_type} metadata changed.",
        request_id=request_id,
        idempotency_key=idempotency_key,
    )
    return True


def withdraw_review(
    session: Session,
    *,
    entity_type: str,
    entity_id: str,
    actor: str,
    reason: str,
    request_id: str,
    idempotency_key: str,
) -> bool:
    review = _get_review_subject(session, entity_type, entity_id)
    if review.state == "withdrawn":
        return False
    _record_linked_transition(
        session,
        review=review,
        target_state="withdrawn",
        actor=actor,
        reason=reason,
        request_id=request_id,
        idempotency_key=idempotency_key,
    )
    return True


def _get_review_subject(session: Session, entity_type: str, entity_id: str) -> ReviewSubject:
    review = session.scalar(
        select(ReviewSubject).where(
            ReviewSubject.entity_type == entity_type,
            ReviewSubject.entity_id == entity_id,
        )
    )
    if review is None:
        raise ReviewError(409, "review_state_not_initialized")
    return review


def _record_linked_transition(
    session: Session,
    *,
    review: ReviewSubject,
    target_state: str,
    actor: str,
    reason: str,
    request_id: str,
    idempotency_key: str,
) -> None:
    current_state = review.state
    now = utc_now()
    review.state = target_state
    review.updated_at = now
    session.add(
        ReviewEvent(
            review_subject_id=review.id,
            entity_type=review.entity_type,
            entity_id=review.entity_id,
            from_state=current_state,
            to_state=target_state,
            actor=actor,
            reason=reason,
            request_id=request_id,
            idempotency_key=idempotency_key,
            occurred_at=now,
        )
    )


class ReviewRegistryService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_reviews(
        self,
        *,
        entity_type: str | None,
        state: str | None,
        limit: int,
        offset: int,
    ) -> ReviewListResponse:
        filters = []
        if entity_type:
            filters.append(ReviewSubject.entity_type == entity_type)
        if state:
            filters.append(ReviewSubject.state == state)

        total = self._session.scalar(select(func.count(ReviewSubject.id)).where(*filters)) or 0
        reviews = self._session.scalars(
            select(ReviewSubject)
            .where(*filters)
            .order_by(ReviewSubject.updated_at.desc(), ReviewSubject.entity_type, ReviewSubject.entity_id)
            .limit(limit)
            .offset(offset)
        ).all()
        return ReviewListResponse(
            items=[ReviewResponse.model_validate(review) for review in reviews],
            total=total,
            limit=limit,
            offset=offset,
        )

    def get_review(self, entity_type: str, entity_id: str) -> ReviewSubject:
        self._assert_entity_exists(entity_type, entity_id)
        return _get_review_subject(self._session, entity_type, entity_id)

    def list_events(self, entity_type: str, entity_id: str) -> list[ReviewEventResponse]:
        review = self.get_review(entity_type, entity_id)
        events = self._session.scalars(
            select(ReviewEvent)
            .where(ReviewEvent.review_subject_id == review.id)
            .order_by(ReviewEvent.occurred_at, ReviewEvent.id)
        ).all()
        return [ReviewEventResponse.model_validate(event) for event in events]

    def transition(
        self,
        entity_type: str,
        entity_id: str,
        payload: ReviewTransitionRequest,
        *,
        if_match: str,
        actor: str,
        request_id: str,
        idempotency_key: str,
    ) -> ReviewMutationResult:
        operation = f"review-transition:{entity_type}:{entity_id}"
        request_payload = payload.model_dump(mode="json", by_alias=True)
        request_hash = _canonical_request_hash(request_payload)
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay

        review = self.get_review(entity_type, entity_id)
        self._assert_etag(review, if_match)
        current_state = review.state
        target_state = payload.target_state
        if target_state not in ALLOWED_TRANSITIONS[current_state]:
            raise ReviewError(409, "illegal_review_transition")

        now = utc_now()
        review.state = target_state
        review.updated_at = now
        try:
            self._session.flush()
            response_body = _review_body(review)
            etag = review_etag(review)
            self._session.add(
                ReviewEvent(
                    review_subject_id=review.id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    from_state=current_state,
                    to_state=target_state,
                    actor=actor,
                    reason=payload.reason,
                    request_id=request_id,
                    idempotency_key=idempotency_key,
                    occurred_at=now,
                )
            )
            self._session.add(
                IdempotencyRecord(
                    actor=actor,
                    operation=operation,
                    idempotency_key=idempotency_key,
                    request_hash=request_hash,
                    response_status=200,
                    response_body=response_body,
                    response_etag=etag,
                )
            )
            self._session.commit()
        except StaleDataError as exc:
            return self._recover_stale_or_replay(
                actor,
                operation,
                idempotency_key,
                request_hash,
                cause=exc,
            )
        except IntegrityError:
            return self._recover_integrity_conflict(
                actor,
                operation,
                idempotency_key,
                request_hash,
            )
        return ReviewMutationResult(status_code=200, body=response_body, etag=etag)

    def _assert_entity_exists(self, entity_type: str, entity_id: str) -> None:
        model = Source if entity_type == "source" else Snapshot
        if self._session.get(model, entity_id) is None:
            raise ReviewError(404, f"{entity_type}_not_found")

    @staticmethod
    def _assert_etag(review: ReviewSubject, if_match: str) -> None:
        if if_match != review_etag(review):
            raise ReviewError(412, "etag_mismatch")

    def _idempotent_replay(
        self,
        actor: str,
        operation: str,
        idempotency_key: str,
        request_hash: str,
    ) -> ReviewMutationResult | None:
        record = self._session.scalar(
            select(IdempotencyRecord).where(
                IdempotencyRecord.actor == actor,
                IdempotencyRecord.operation == operation,
                IdempotencyRecord.idempotency_key == idempotency_key,
            )
        )
        if record is None:
            return None
        if record.request_hash != request_hash:
            raise ReviewError(409, "idempotency_key_reused_with_different_payload")
        if record.response_etag is None:
            raise ReviewError(409, "idempotency_record_missing_etag")
        return ReviewMutationResult(
            status_code=record.response_status,
            body=record.response_body,
            etag=record.response_etag,
            replayed=True,
        )

    def _recover_integrity_conflict(
        self,
        actor: str,
        operation: str,
        idempotency_key: str,
        request_hash: str,
    ) -> ReviewMutationResult:
        self._session.rollback()
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay
        raise ReviewError(409, "review_transition_conflict")

    def _recover_stale_or_replay(
        self,
        actor: str,
        operation: str,
        idempotency_key: str,
        request_hash: str,
        *,
        cause: StaleDataError,
    ) -> ReviewMutationResult:
        self._session.rollback()
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay
        raise ReviewError(412, "etag_mismatch") from cause
