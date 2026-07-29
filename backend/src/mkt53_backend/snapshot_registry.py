from __future__ import annotations

from datetime import UTC, date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from mkt53_backend.models import AuditEvent, IdempotencyRecord, Snapshot, Source
from mkt53_backend.review_registry import open_review
from mkt53_backend.schemas import (
    AuditEventResponse,
    SnapshotCreate,
    SnapshotListResponse,
    SnapshotResponse,
)
from mkt53_backend.source_registry import (
    MutationResult,
    RegistryError,
    canonical_request_hash,
)

METADATA_HASH_VERSION = "mkt53.snapshot-metadata.v1"


def canonical_snapshot_metadata(payload: SnapshotCreate) -> dict[str, Any]:
    return {
        "artifactSha256": payload.artifact_sha256,
        "artifactSizeBytes": payload.artifact_size_bytes,
        "artifactUri": payload.artifact_uri,
        "collectedAt": payload.collected_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
        "contentType": payload.content_type,
        "hashVersion": METADATA_HASH_VERSION,
        "rowCount": payload.row_count,
        "schemaSha256": payload.schema_sha256,
        "schemaVersion": payload.schema_version,
        "sourceId": payload.source_id,
        "windowEnd": payload.window_end.isoformat(),
        "windowStart": payload.window_start.isoformat(),
    }


def snapshot_metadata_sha256(payload: SnapshotCreate) -> str:
    return canonical_request_hash(canonical_snapshot_metadata(payload))


def snapshot_etag(snapshot: Snapshot) -> str:
    return f'"snapshot:{snapshot.id}:{snapshot.metadata_sha256}"'


def _snapshot_body(snapshot: Snapshot) -> dict[str, Any]:
    return SnapshotResponse.model_validate(snapshot).model_dump(mode="json", by_alias=True)


class SnapshotRegistryService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_snapshots(
        self,
        *,
        source_id: str | None,
        schema_version: str | None,
        window_start: date | None,
        window_end: date | None,
        limit: int,
        offset: int,
    ) -> SnapshotListResponse:
        filters = []
        if source_id:
            filters.append(Snapshot.source_id == source_id)
        if schema_version:
            filters.append(Snapshot.schema_version == schema_version)
        if window_start:
            filters.append(Snapshot.window_end >= window_start)
        if window_end:
            filters.append(Snapshot.window_start <= window_end)

        total = self._session.scalar(select(func.count(Snapshot.id)).where(*filters)) or 0
        snapshots = self._session.scalars(
            select(Snapshot)
            .where(*filters)
            .order_by(Snapshot.imported_at.desc(), Snapshot.id)
            .limit(limit)
            .offset(offset)
        ).all()
        return SnapshotListResponse(
            items=[SnapshotResponse.model_validate(snapshot) for snapshot in snapshots],
            total=total,
            limit=limit,
            offset=offset,
        )

    def get_snapshot(self, snapshot_id: str) -> Snapshot:
        snapshot = self._session.get(Snapshot, snapshot_id)
        if snapshot is None:
            raise RegistryError(404, "snapshot_not_found")
        return snapshot

    def list_audit_events(self, snapshot_id: str) -> list[AuditEventResponse]:
        self.get_snapshot(snapshot_id)
        events = self._session.scalars(
            select(AuditEvent)
            .where(AuditEvent.entity_type == "snapshot", AuditEvent.entity_id == snapshot_id)
            .order_by(AuditEvent.occurred_at, AuditEvent.id)
        ).all()
        return [AuditEventResponse.model_validate(event) for event in events]

    def create_snapshot(
        self,
        payload: SnapshotCreate,
        *,
        actor: str,
        request_id: str,
        idempotency_key: str,
    ) -> MutationResult:
        operation = f"create-snapshot:{payload.id}"
        request_payload = payload.model_dump(mode="json", by_alias=True)
        request_hash = canonical_request_hash(request_payload)
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay

        source = self._session.get(Source, payload.source_id)
        if source is None:
            raise RegistryError(404, "source_not_found")
        if source.lifecycle_status != "active":
            raise RegistryError(409, "source_withdrawn_snapshot_import_forbidden")

        metadata_sha256 = snapshot_metadata_sha256(payload)
        duplicate = self._find_existing(payload, metadata_sha256)
        if duplicate is not None:
            return self._record_duplicate_replay(
                duplicate,
                actor=actor,
                operation=operation,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
            )

        snapshot = Snapshot(
            **payload.model_dump(),
            metadata_hash_version=METADATA_HASH_VERSION,
            metadata_sha256=metadata_sha256,
            imported_by=actor,
        )
        self._session.add(snapshot)
        try:
            self._session.flush()
            response_body = _snapshot_body(snapshot)
            etag = snapshot_etag(snapshot)
            open_review(
                self._session,
                entity_type="snapshot",
                entity_id=snapshot.id,
                actor=actor,
                request_id=request_id,
                idempotency_key=idempotency_key,
            )
            self._session.add(
                AuditEvent(
                    entity_type="snapshot",
                    entity_id=snapshot.id,
                    action="create",
                    actor=actor,
                    request_id=request_id,
                    idempotency_key=idempotency_key,
                    before_state=None,
                    after_state=response_body,
                )
            )
            self._session.add(
                IdempotencyRecord(
                    actor=actor,
                    operation=operation,
                    idempotency_key=idempotency_key,
                    request_hash=request_hash,
                    response_status=201,
                    response_body=response_body,
                    response_etag=etag,
                )
            )
            self._session.commit()
        except IntegrityError:
            return self._recover_create_conflict(
                payload,
                metadata_sha256,
                actor=actor,
                operation=operation,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
            )
        return MutationResult(status_code=201, body=response_body, etag=etag)

    def _find_existing(self, payload: SnapshotCreate, metadata_sha256: str) -> Snapshot | None:
        by_id = self._session.get(Snapshot, payload.id)
        if by_id is not None:
            if by_id.metadata_sha256 == metadata_sha256:
                return by_id
            raise RegistryError(409, "snapshot_id_conflict")

        by_fingerprint = self._session.scalar(
            select(Snapshot).where(
                Snapshot.source_id == payload.source_id,
                Snapshot.artifact_sha256 == payload.artifact_sha256,
                Snapshot.schema_version == payload.schema_version,
            )
        )
        if by_fingerprint is not None:
            if by_fingerprint.metadata_sha256 == metadata_sha256:
                return by_fingerprint
            raise RegistryError(409, "snapshot_fingerprint_conflict")

        by_metadata = self._session.scalar(select(Snapshot).where(Snapshot.metadata_sha256 == metadata_sha256))
        return by_metadata

    def _record_duplicate_replay(
        self,
        snapshot: Snapshot,
        *,
        actor: str,
        operation: str,
        idempotency_key: str,
        request_hash: str,
    ) -> MutationResult:
        response_body = _snapshot_body(snapshot)
        etag = snapshot_etag(snapshot)
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
        try:
            self._session.commit()
        except IntegrityError:
            self._session.rollback()
            replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
            if replay:
                return replay
            raise RegistryError(409, "snapshot_duplicate_replay_conflict") from None
        return MutationResult(status_code=200, body=response_body, etag=etag, replayed=True)

    def _recover_create_conflict(
        self,
        payload: SnapshotCreate,
        metadata_sha256: str,
        *,
        actor: str,
        operation: str,
        idempotency_key: str,
        request_hash: str,
    ) -> MutationResult:
        self._session.rollback()
        replay = self._idempotent_replay(actor, operation, idempotency_key, request_hash)
        if replay:
            return replay
        duplicate = self._find_existing(payload, metadata_sha256)
        if duplicate is not None:
            return self._record_duplicate_replay(
                duplicate,
                actor=actor,
                operation=operation,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
            )
        raise RegistryError(409, "snapshot_create_conflict")

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
