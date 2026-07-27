from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any, ClassVar

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class Source(Base):
    __tablename__ = "sources"
    __table_args__ = (
        CheckConstraint("reliability IN ('A', 'B', 'C', 'D')", name="ck_sources_reliability"),
        CheckConstraint(
            "verification_status IN ('verified', 'needs-review', 'example')",
            name="ck_sources_verification_status",
        ),
        CheckConstraint(
            "privacy_level IN ('public', 'private/internal', 'sensitive', 'secret')",
            name="ck_sources_privacy_level",
        ),
        CheckConstraint(
            "collection_method IN ('public-url-check', 'connector-required', 'manual-required', 'local-file-check')",
            name="ck_sources_collection_method",
        ),
        CheckConstraint(
            "evidence_grade IN "
            "('L0-unverified', 'L1-public-or-runtime', 'L2-fixture-or-dry-run', "
            "'L3-production-read-only', 'LO-S-synthetic')",
            name="ck_sources_evidence_grade",
        ),
        CheckConstraint("lifecycle_status IN ('active', 'withdrawn')", name="ck_sources_lifecycle_status"),
        CheckConstraint("version >= 1", name="ck_sources_version_positive"),
        Index("ix_sources_module_status", "module", "lifecycle_status"),
        Index("ix_sources_verification_status", "verification_status"),
    )

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    module: Mapped[str] = mapped_column(String(128))
    page: Mapped[str] = mapped_column(String(128))
    metric: Mapped[str] = mapped_column(String(256))
    source_name: Mapped[str] = mapped_column(String(256))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String(128))
    year: Mapped[str] = mapped_column("coverage_period", String(64))
    reliability: Mapped[str] = mapped_column(String(1))
    verification_status: Mapped[str] = mapped_column(String(32))
    last_verified: Mapped[date] = mapped_column(Date)
    note: Mapped[str] = mapped_column(Text, default="")
    gap: Mapped[str] = mapped_column(Text, default="")
    action: Mapped[str] = mapped_column(Text, default="")
    privacy_level: Mapped[str] = mapped_column(String(32))
    collection_method: Mapped[str] = mapped_column(String(32))
    evidence_grade: Mapped[str] = mapped_column(String(32))
    can_display_as_fact: Mapped[bool] = mapped_column(Boolean)
    blocking_reason: Mapped[str] = mapped_column(Text, default="")
    evidence_artifact_path: Mapped[str] = mapped_column(Text, default="")
    claim_scope: Mapped[str] = mapped_column(Text)
    owner: Mapped[str] = mapped_column(String(128))
    lifecycle_status: Mapped[str] = mapped_column(String(16), default="active")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    withdrawn_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    __mapper_args__: ClassVar[dict[str, Any]] = {"version_id_col": version}


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        CheckConstraint("action IN ('create', 'update', 'withdraw')", name="ck_audit_events_action"),
        Index("ix_audit_events_entity", "entity_type", "entity_id", "occurred_at"),
        Index("ix_audit_events_request_id", "request_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type: Mapped[str] = mapped_column(String(32), default="source")
    entity_id: Mapped[str] = mapped_column(String(128))
    action: Mapped[str] = mapped_column(String(16))
    actor: Mapped[str] = mapped_column(String(128))
    request_id: Mapped[str] = mapped_column(String(128))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    before_state: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    after_state: Mapped[dict[str, Any]] = mapped_column(JSON)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (
        UniqueConstraint(
            "actor",
            "operation",
            "idempotency_key",
            name="uq_idempotency_actor_operation_key",
        ),
        Index("ix_idempotency_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor: Mapped[str] = mapped_column(String(128))
    operation: Mapped[str] = mapped_column(String(256))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    request_hash: Mapped[str] = mapped_column(String(64))
    response_status: Mapped[int] = mapped_column(Integer)
    response_body: Mapped[dict[str, Any]] = mapped_column(JSON)
    response_etag: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Snapshot(Base):
    __tablename__ = "snapshots"
    __table_args__ = (
        CheckConstraint("row_count >= 0", name="ck_snapshots_row_count_nonnegative"),
        CheckConstraint("artifact_size_bytes >= 0", name="ck_snapshots_artifact_size_nonnegative"),
        CheckConstraint("window_start <= window_end", name="ck_snapshots_window_order"),
        CheckConstraint("length(artifact_sha256) = 64", name="ck_snapshots_artifact_sha256_length"),
        CheckConstraint("length(schema_sha256) = 64", name="ck_snapshots_schema_sha256_length"),
        CheckConstraint("length(metadata_sha256) = 64", name="ck_snapshots_metadata_sha256_length"),
        UniqueConstraint(
            "source_id",
            "artifact_sha256",
            "schema_version",
            name="uq_snapshots_source_artifact_schema",
        ),
        UniqueConstraint("metadata_sha256", name="uq_snapshots_metadata_sha256"),
        Index("ix_snapshots_source_window", "source_id", "window_start", "window_end"),
        Index("ix_snapshots_imported_at", "imported_at"),
    )

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    source_id: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("sources.id", ondelete="RESTRICT"),
        nullable=False,
    )
    window_start: Mapped[date] = mapped_column(Date)
    window_end: Mapped[date] = mapped_column(Date)
    row_count: Mapped[int] = mapped_column(BigInteger)
    artifact_uri: Mapped[str] = mapped_column(Text)
    artifact_sha256: Mapped[str] = mapped_column(String(64))
    artifact_size_bytes: Mapped[int] = mapped_column(BigInteger)
    content_type: Mapped[str] = mapped_column(String(128))
    schema_version: Mapped[str] = mapped_column(String(64))
    schema_sha256: Mapped[str] = mapped_column(String(64))
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    metadata_hash_version: Mapped[str] = mapped_column(String(64))
    metadata_sha256: Mapped[str] = mapped_column(String(64))
    imported_by: Mapped[str] = mapped_column(String(128))
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ReviewSubject(Base):
    __tablename__ = "review_subjects"
    __table_args__ = (
        CheckConstraint("entity_type IN ('source', 'snapshot')", name="ck_review_subjects_entity_type"),
        CheckConstraint(
            "state IN ('pending', 'approved', 'rejected', 'withdrawn')",
            name="ck_review_subjects_state",
        ),
        CheckConstraint("version >= 1", name="ck_review_subjects_version_positive"),
        UniqueConstraint("entity_type", "entity_id", name="uq_review_subjects_entity"),
        Index("ix_review_subjects_state_entity", "state", "entity_type", "updated_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type: Mapped[str] = mapped_column(String(16))
    entity_id: Mapped[str] = mapped_column(String(128))
    state: Mapped[str] = mapped_column(String(16), default="pending")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __mapper_args__: ClassVar[dict[str, Any]] = {"version_id_col": version}


class ReviewEvent(Base):
    __tablename__ = "review_events"
    __table_args__ = (
        CheckConstraint("entity_type IN ('source', 'snapshot')", name="ck_review_events_entity_type"),
        CheckConstraint(
            "from_state IS NULL OR from_state IN ('pending', 'approved', 'rejected', 'withdrawn')",
            name="ck_review_events_from_state",
        ),
        CheckConstraint(
            "to_state IN ('pending', 'approved', 'rejected', 'withdrawn')",
            name="ck_review_events_to_state",
        ),
        CheckConstraint("from_state IS NULL OR from_state <> to_state", name="ck_review_events_state_change"),
        CheckConstraint("length(trim(reason)) >= 8", name="ck_review_events_reason_length"),
        Index("ix_review_events_entity", "entity_type", "entity_id", "occurred_at"),
        Index("ix_review_events_subject", "review_subject_id", "occurred_at"),
        Index("ix_review_events_request_id", "request_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    review_subject_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("review_subjects.id", ondelete="RESTRICT"),
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(String(16))
    entity_id: Mapped[str] = mapped_column(String(128))
    from_state: Mapped[str | None] = mapped_column(String(16), nullable=True)
    to_state: Mapped[str] = mapped_column(String(16))
    actor: Mapped[str] = mapped_column(String(128))
    reason: Mapped[str] = mapped_column(Text)
    request_id: Mapped[str] = mapped_column(String(128))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


@event.listens_for(AuditEvent, "before_update", propagate=True)
def reject_audit_update(_mapper, _connection, _target) -> None:
    raise RuntimeError("audit_events are append-only")


@event.listens_for(AuditEvent, "before_delete", propagate=True)
def reject_audit_delete(_mapper, _connection, _target) -> None:
    raise RuntimeError("audit_events are append-only")


@event.listens_for(Snapshot, "before_update", propagate=True)
def reject_snapshot_update(_mapper, _connection, _target) -> None:
    raise RuntimeError("snapshots are immutable")


@event.listens_for(Snapshot, "before_delete", propagate=True)
def reject_snapshot_delete(_mapper, _connection, _target) -> None:
    raise RuntimeError("snapshots are immutable")


@event.listens_for(ReviewEvent, "before_update", propagate=True)
def reject_review_event_update(_mapper, _connection, _target) -> None:
    raise RuntimeError("review_events are append-only")


@event.listens_for(ReviewEvent, "before_delete", propagate=True)
def reject_review_event_delete(_mapper, _connection, _target) -> None:
    raise RuntimeError("review_events are append-only")
