from __future__ import annotations

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


class Reliability(StrEnum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class VerificationStatus(StrEnum):
    VERIFIED = "verified"
    NEEDS_REVIEW = "needs-review"
    EXAMPLE = "example"


class PrivacyLevel(StrEnum):
    PUBLIC = "public"
    PRIVATE_INTERNAL = "private/internal"
    SENSITIVE = "sensitive"
    SECRET = "secret"


class CollectionMethod(StrEnum):
    PUBLIC_URL_CHECK = "public-url-check"
    CONNECTOR_REQUIRED = "connector-required"
    MANUAL_REQUIRED = "manual-required"
    LOCAL_FILE_CHECK = "local-file-check"


class EvidenceGrade(StrEnum):
    UNVERIFIED = "L0-unverified"
    PUBLIC_OR_RUNTIME = "L1-public-or-runtime"
    FIXTURE_OR_DRY_RUN = "L2-fixture-or-dry-run"
    PRODUCTION_READ_ONLY = "L3-production-read-only"
    SYNTHETIC = "LO-S-synthetic"


class LifecycleStatus(StrEnum):
    ACTIVE = "active"
    WITHDRAWN = "withdrawn"


class ReviewEntityType(StrEnum):
    SOURCE = "source"
    SNAPSHOT = "snapshot"


class ReviewState(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class ReviewDecision(StrEnum):
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


FACT_ELIGIBLE_EVIDENCE_GRADES = frozenset(
    {
        EvidenceGrade.PUBLIC_OR_RUNTIME.value,
        EvidenceGrade.PRODUCTION_READ_ONLY.value,
    }
)


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
        use_enum_values=True,
    )


def _validate_http_url(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    try:
        parts = urlsplit(normalized)
        hostname = parts.hostname
    except ValueError as exc:
        raise ValueError("sourceUrl must be an absolute HTTP(S) URL") from exc
    if (
        parts.scheme not in {"http", "https"}
        or not parts.netloc
        or hostname is None
        or parts.username is not None
        or parts.password is not None
        or any(character.isspace() for character in normalized)
    ):
        raise ValueError("sourceUrl must be an absolute HTTP(S) URL")
    return normalized


def validate_source_fact_governance(
    *,
    verification_status: str,
    evidence_grade: str,
    can_display_as_fact: bool,
    blocking_reason: str,
) -> None:
    if can_display_as_fact:
        if verification_status != VerificationStatus.VERIFIED.value:
            raise ValueError("canDisplayAsFact requires verificationStatus=verified")
        if evidence_grade not in FACT_ELIGIBLE_EVIDENCE_GRADES:
            raise ValueError("canDisplayAsFact requires L1 or L3 evidence")
    elif not blocking_reason.strip():
        raise ValueError("blockingReason is required when canDisplayAsFact=false")


class SourceCreate(ApiModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{2,127}$")
    module: str = Field(min_length=1, max_length=128)
    page: str = Field(min_length=1, max_length=128)
    metric: str = Field(min_length=1, max_length=256)
    source_name: str = Field(min_length=1, max_length=256)
    source_url: str | None = Field(default=None, max_length=4096)
    source_type: str = Field(min_length=1, max_length=128)
    year: str = Field(min_length=1, max_length=64)
    reliability: Reliability
    verification_status: VerificationStatus
    last_verified: date
    note: str = Field(default="", max_length=20000)
    gap: str = Field(default="", max_length=20000)
    action: str = Field(default="", max_length=20000)
    privacy_level: PrivacyLevel
    collection_method: CollectionMethod
    evidence_grade: EvidenceGrade
    can_display_as_fact: bool
    blocking_reason: str = Field(default="", max_length=20000)
    evidence_artifact_path: str = Field(default="", max_length=4096)
    claim_scope: str = Field(min_length=1, max_length=20000)
    owner: str = Field(min_length=3, max_length=128, pattern=r"^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$")

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None) -> str | None:
        return _validate_http_url(value)

    @model_validator(mode="after")
    def validate_fact_governance(self) -> SourceCreate:
        validate_source_fact_governance(
            verification_status=self.verification_status,
            evidence_grade=self.evidence_grade,
            can_display_as_fact=self.can_display_as_fact,
            blocking_reason=self.blocking_reason,
        )
        return self


class SourceUpdate(ApiModel):
    module: str | None = Field(default=None, min_length=1, max_length=128)
    page: str | None = Field(default=None, min_length=1, max_length=128)
    metric: str | None = Field(default=None, min_length=1, max_length=256)
    source_name: str | None = Field(default=None, min_length=1, max_length=256)
    source_url: str | None = Field(default=None, max_length=4096)
    source_type: str | None = Field(default=None, min_length=1, max_length=128)
    year: str | None = Field(default=None, min_length=1, max_length=64)
    reliability: Reliability | None = None
    verification_status: VerificationStatus | None = None
    last_verified: date | None = None
    note: str | None = Field(default=None, max_length=20000)
    gap: str | None = Field(default=None, max_length=20000)
    action: str | None = Field(default=None, max_length=20000)
    privacy_level: PrivacyLevel | None = None
    collection_method: CollectionMethod | None = None
    evidence_grade: EvidenceGrade | None = None
    can_display_as_fact: bool | None = None
    blocking_reason: str | None = Field(default=None, max_length=20000)
    evidence_artifact_path: str | None = Field(default=None, max_length=4096)
    claim_scope: str | None = Field(default=None, min_length=1, max_length=20000)
    owner: str | None = Field(
        default=None,
        min_length=3,
        max_length=128,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$",
    )

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None) -> str | None:
        return _validate_http_url(value)

    @model_validator(mode="after")
    def reject_empty_or_null_patch(self) -> SourceUpdate:
        if not self.model_fields_set:
            raise ValueError("at least one source field is required")
        for field_name in self.model_fields_set - {"source_url"}:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class WithdrawSourceRequest(ApiModel):
    reason: str = Field(min_length=8, max_length=1000)


class SourceResponse(ApiModel):
    id: str
    module: str
    page: str
    metric: str
    source_name: str
    source_url: str | None
    source_type: str
    year: str
    reliability: Reliability
    verification_status: VerificationStatus
    last_verified: date
    note: str
    gap: str
    action: str
    privacy_level: PrivacyLevel
    collection_method: CollectionMethod
    evidence_grade: EvidenceGrade
    can_display_as_fact: bool
    blocking_reason: str
    evidence_artifact_path: str
    claim_scope: str
    owner: str
    lifecycle_status: LifecycleStatus
    version: int
    created_at: datetime
    updated_at: datetime
    withdrawn_at: datetime | None
    withdrawn_reason: str | None


class SourceListResponse(ApiModel):
    items: list[SourceResponse]
    total: int
    limit: int
    offset: int


class AuditEventResponse(ApiModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    actor: str
    request_id: str
    idempotency_key: str
    before_state: dict[str, Any] | None
    after_state: dict[str, Any]
    occurred_at: datetime


class SnapshotCreate(ApiModel):
    id: str = Field(pattern=r"^snap-[a-z0-9][a-z0-9._-]{2,122}$")
    source_id: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]{2,127}$")
    window_start: date
    window_end: date
    row_count: int = Field(ge=0, le=9_223_372_036_854_775_807)
    artifact_uri: str = Field(min_length=1, max_length=4096)
    artifact_sha256: str = Field(pattern=r"^[A-Fa-f0-9]{64}$")
    artifact_size_bytes: int = Field(ge=0, le=9_223_372_036_854_775_807)
    content_type: str = Field(min_length=1, max_length=128)
    schema_version: str = Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
    schema_sha256: str = Field(pattern=r"^[A-Fa-f0-9]{64}$")
    collected_at: datetime

    @field_validator("artifact_sha256", "schema_sha256")
    @classmethod
    def normalize_sha256(cls, value: str) -> str:
        return value.lower()

    @field_validator("artifact_uri")
    @classmethod
    def validate_artifact_uri(cls, value: str) -> str:
        normalized = value.strip()
        try:
            parts = urlsplit(normalized)
        except ValueError as exc:
            raise ValueError("artifactUri must be an absolute fixture, HTTPS, S3, or GS URI") from exc
        if (
            parts.scheme not in {"fixture", "https", "s3", "gs"}
            or not parts.netloc
            or parts.username is not None
            or parts.password is not None
            or any(character.isspace() for character in normalized)
        ):
            raise ValueError("artifactUri must be an absolute fixture, HTTPS, S3, or GS URI")
        return normalized

    @field_validator("collected_at")
    @classmethod
    def normalize_collected_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("collectedAt must include a timezone")
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def validate_window(self) -> SnapshotCreate:
        if self.window_start > self.window_end:
            raise ValueError("windowStart must be on or before windowEnd")
        return self


class SnapshotResponse(ApiModel):
    id: str
    source_id: str
    window_start: date
    window_end: date
    row_count: int
    artifact_uri: str
    artifact_sha256: str
    artifact_size_bytes: int
    content_type: str
    schema_version: str
    schema_sha256: str
    collected_at: datetime
    metadata_hash_version: str
    metadata_sha256: str
    imported_by: str
    imported_at: datetime


class SnapshotListResponse(ApiModel):
    items: list[SnapshotResponse]
    total: int
    limit: int
    offset: int


class ReviewTransitionRequest(ApiModel):
    target_state: ReviewDecision
    reason: str = Field(min_length=8, max_length=1000)


class ReviewResponse(ApiModel):
    id: str
    entity_type: ReviewEntityType
    entity_id: str
    state: ReviewState
    version: int
    created_at: datetime
    updated_at: datetime


class ReviewListResponse(ApiModel):
    items: list[ReviewResponse]
    total: int
    limit: int
    offset: int


class ReviewEventResponse(ApiModel):
    id: str
    review_subject_id: str
    entity_type: ReviewEntityType
    entity_id: str
    from_state: ReviewState | None
    to_state: ReviewState
    actor: str
    reason: str
    request_id: str
    idempotency_key: str
    occurred_at: datetime
