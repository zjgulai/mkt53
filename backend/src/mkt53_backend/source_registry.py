from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from mkt53_backend.models import AuditEvent, IdempotencyRecord, Source, utc_now
from mkt53_backend.review_registry import open_review, reopen_review, withdraw_review
from mkt53_backend.schemas import (
    AuditEventResponse,
    SourceCreate,
    SourceListResponse,
    SourceResponse,
    SourceUpdate,
)


class RegistryError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@dataclass(frozen=True)
class MutationResult:
    status_code: int
    body: dict[str, Any]
    etag: str | None
    replayed: bool = False


def source_etag(source: Source) -> str:
    return f'"source:{source.id}:v{source.version}"'


def canonical_request_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _source_body(source: Source) -> dict[str, Any]:
    return SourceResponse.model_validate(source).model_dump(mode="json", by_alias=True)


class SourceRegistryService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_sources(
        self,
        *,
        include_withdrawn: bool,
        module: str | None,
        verification_status: str | None,
        limit: int,
        offset: int,
    ) -> SourceListResponse:
        filters = []
        if not include_withdrawn:
            filters.append(Source.lifecycle_status == "active")
        if module:
            filters.append(Source.module == module)
        if verification_status:
            filters.append(Source.verification_status == verification_status)

        total = self._session.scalar(select(func.count(Source.id)).where(*filters)) or 0
        sources = self._session.scalars(
            select(Source).where(*filters).order_by(Source.id).limit(limit).offset(offset)
        ).all()
        return SourceListResponse(
            items=[SourceResponse.model_validate(source) for source in sources],
            total=total,
            limit=limit,
            offset=offset,
        )

    def get_source(self, source_id: str) -> Source:
        source = self._session.get(Source, source_id)
        if source is None:
            raise RegistryError(404, "source_not_found")
        return source

    def list_audit_events(self, source_id: str) -> list[AuditEventResponse]:
        self.get_source(source_id)
        events = self._session.scalars(
            select(AuditEvent)
            .where(AuditEvent.entity_type == "source", AuditEvent.entity_id == source_id)
            .order_by(AuditEvent.occurred_at, AuditEvent.id)
        ).all()
        return [AuditEventResponse.model_validate(event) for event in events]

    def create_source(
        self,
        payload: SourceCreate,
        *,
        actor: str,
        request_id: str,
        idempotency_key: str,
    ) -> MutationResult:
        operation = f"create:{payload.id}"
        request_payload = payload.model_dump(mode="json", by_alias=True)
        request_hash = canonical_request_hash(request_payload)
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay
        if self._session.get(Source, payload.id) is not None:
            raise RegistryError(409, "source_already_exists")

        source = Source(**payload.model_dump())
        self._session.add(source)
        try:
            self._session.flush()
            response_body = _source_body(source)
            etag = source_etag(source)
            open_review(
                self._session,
                entity_type="source",
                entity_id=source.id,
                actor=actor,
                request_id=request_id,
                idempotency_key=idempotency_key,
            )
            self._record_mutation(
                source=source,
                action="create",
                actor=actor,
                request_id=request_id,
                idempotency_key=idempotency_key,
                before_state=None,
                after_state=response_body,
                operation=operation,
                request_hash=request_hash,
                response_status=201,
                response_body=response_body,
                response_etag=etag,
            )
            self._session.commit()
        except IntegrityError:
            return self._recover_integrity_conflict(
                actor,
                operation,
                idempotency_key,
                request_hash,
                fallback_detail="source_already_exists",
            )
        return MutationResult(status_code=201, body=response_body, etag=etag)

    def update_source(
        self,
        source_id: str,
        payload: SourceUpdate,
        *,
        if_match: str,
        actor: str,
        request_id: str,
        idempotency_key: str,
    ) -> MutationResult:
        operation = f"update:{source_id}"
        request_payload = payload.model_dump(mode="json", by_alias=True, exclude_unset=True)
        request_hash = canonical_request_hash(request_payload)
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay

        source = self.get_source(source_id)
        self._assert_active(source)
        self._assert_etag(source, if_match)
        before_state = _source_body(source)
        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(source, field_name, value)
        source.updated_at = utc_now()

        try:
            reopen_review(
                self._session,
                entity_type="source",
                entity_id=source.id,
                actor=actor,
                request_id=request_id,
                idempotency_key=idempotency_key,
            )
            self._session.flush()
            response_body = _source_body(source)
            etag = source_etag(source)
            self._record_mutation(
                source=source,
                action="update",
                actor=actor,
                request_id=request_id,
                idempotency_key=idempotency_key,
                before_state=before_state,
                after_state=response_body,
                operation=operation,
                request_hash=request_hash,
                response_status=200,
                response_body=response_body,
                response_etag=etag,
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
                fallback_detail="source_update_conflict",
            )
        return MutationResult(status_code=200, body=response_body, etag=etag)

    def withdraw_source(
        self,
        source_id: str,
        reason: str,
        *,
        if_match: str,
        actor: str,
        request_id: str,
        idempotency_key: str,
    ) -> MutationResult:
        operation = f"withdraw:{source_id}"
        request_payload = {"reason": reason}
        request_hash = canonical_request_hash(request_payload)
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay

        source = self.get_source(source_id)
        self._assert_active(source)
        self._assert_etag(source, if_match)
        before_state = _source_body(source)
        now = utc_now()
        source.lifecycle_status = "withdrawn"
        source.withdrawn_at = now
        source.withdrawn_reason = reason
        source.updated_at = now

        try:
            withdraw_review(
                self._session,
                entity_type="source",
                entity_id=source.id,
                actor=actor,
                reason=reason,
                request_id=request_id,
                idempotency_key=idempotency_key,
            )
            self._session.flush()
            response_body = _source_body(source)
            etag = source_etag(source)
            self._record_mutation(
                source=source,
                action="withdraw",
                actor=actor,
                request_id=request_id,
                idempotency_key=idempotency_key,
                before_state=before_state,
                after_state=response_body,
                operation=operation,
                request_hash=request_hash,
                response_status=200,
                response_body=response_body,
                response_etag=etag,
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
                fallback_detail="source_withdraw_conflict",
            )
        return MutationResult(status_code=200, body=response_body, etag=etag)

    def _record_mutation(
        self,
        *,
        source: Source,
        action: str,
        actor: str,
        request_id: str,
        idempotency_key: str,
        before_state: dict[str, Any] | None,
        after_state: dict[str, Any],
        operation: str,
        request_hash: str,
        response_status: int,
        response_body: dict[str, Any],
        response_etag: str,
    ) -> None:
        self._session.add(
            AuditEvent(
                entity_id=source.id,
                action=action,
                actor=actor,
                request_id=request_id,
                idempotency_key=idempotency_key,
                before_state=before_state,
                after_state=after_state,
            )
        )
        self._session.add(
            IdempotencyRecord(
                actor=actor,
                operation=operation,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
                response_status=response_status,
                response_body=response_body,
                response_etag=response_etag,
            )
        )

    def _idempotent_replay(
        self,
        actor: str,
        operation: str,
        idempotency_key: str,
        request_hash: str,
    ) -> MutationResult | None:
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
            raise RegistryError(409, "idempotency_key_reused_with_different_payload")
        return MutationResult(
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
        *,
        fallback_detail: str,
    ) -> MutationResult:
        self._session.rollback()
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay
        raise RegistryError(409, fallback_detail)

    def _recover_stale_or_replay(
        self,
        actor: str,
        operation: str,
        idempotency_key: str,
        request_hash: str,
        *,
        cause: StaleDataError,
    ) -> MutationResult:
        self._session.rollback()
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay
        raise RegistryError(412, "etag_mismatch") from cause

    @staticmethod
    def _assert_etag(source: Source, if_match: str) -> None:
        if if_match != source_etag(source):
            raise RegistryError(412, "etag_mismatch")

    @staticmethod
    def _assert_active(source: Source) -> None:
        if source.lifecycle_status != "active":
            raise RegistryError(409, "source_already_withdrawn")
