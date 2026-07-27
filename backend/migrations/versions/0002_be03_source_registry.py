"""Create the versioned source registry and append-only audit tables.

Revision ID: 0002_be03_source_registry
Revises: 0001_be02_baseline
Create Date: 2026-07-24
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_be03_source_registry"
down_revision: str | Sequence[str] | None = "0001_be02_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sources",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("module", sa.String(length=128), nullable=False),
        sa.Column("page", sa.String(length=128), nullable=False),
        sa.Column("metric", sa.String(length=256), nullable=False),
        sa.Column("source_name", sa.String(length=256), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=128), nullable=False),
        sa.Column("coverage_period", sa.String(length=64), nullable=False),
        sa.Column("reliability", sa.String(length=1), nullable=False),
        sa.Column("verification_status", sa.String(length=32), nullable=False),
        sa.Column("last_verified", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("gap", sa.Text(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("privacy_level", sa.String(length=32), nullable=False),
        sa.Column("collection_method", sa.String(length=32), nullable=False),
        sa.Column("evidence_grade", sa.String(length=32), nullable=False),
        sa.Column("can_display_as_fact", sa.Boolean(), nullable=False),
        sa.Column("blocking_reason", sa.Text(), nullable=False),
        sa.Column("evidence_artifact_path", sa.Text(), nullable=False),
        sa.Column("claim_scope", sa.Text(), nullable=False),
        sa.Column("owner", sa.String(length=128), nullable=False),
        sa.Column("lifecycle_status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("withdrawn_reason", sa.Text(), nullable=True),
        sa.CheckConstraint("reliability IN ('A', 'B', 'C', 'D')", name="ck_sources_reliability"),
        sa.CheckConstraint(
            "verification_status IN ('verified', 'needs-review', 'example')",
            name="ck_sources_verification_status",
        ),
        sa.CheckConstraint(
            "privacy_level IN ('public', 'private/internal', 'sensitive', 'secret')",
            name="ck_sources_privacy_level",
        ),
        sa.CheckConstraint(
            "collection_method IN ('public-url-check', 'connector-required', 'manual-required', 'local-file-check')",
            name="ck_sources_collection_method",
        ),
        sa.CheckConstraint(
            "evidence_grade IN "
            "('L0-unverified', 'L1-public-or-runtime', 'L2-fixture-or-dry-run', "
            "'L3-production-read-only', 'LO-S-synthetic')",
            name="ck_sources_evidence_grade",
        ),
        sa.CheckConstraint("lifecycle_status IN ('active', 'withdrawn')", name="ck_sources_lifecycle_status"),
        sa.CheckConstraint("version >= 1", name="ck_sources_version_positive"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sources_module_status", "sources", ["module", "lifecycle_status"])
    op.create_index("ix_sources_verification_status", "sources", ["verification_status"])

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("entity_type", sa.String(length=32), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=16), nullable=False),
        sa.Column("actor", sa.String(length=128), nullable=False),
        sa.Column("request_id", sa.String(length=128), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("before_state", sa.JSON(), nullable=True),
        sa.Column("after_state", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("action IN ('create', 'update', 'withdraw')", name="ck_audit_events_action"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_audit_events_entity",
        "audit_events",
        ["entity_type", "entity_id", "occurred_at"],
    )
    op.create_index("ix_audit_events_request_id", "audit_events", ["request_id"])

    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("actor", sa.String(length=128), nullable=False),
        sa.Column("operation", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response_status", sa.Integer(), nullable=False),
        sa.Column("response_body", sa.JSON(), nullable=False),
        sa.Column("response_etag", sa.String(length=256), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "actor",
            "operation",
            "idempotency_key",
            name="uq_idempotency_actor_operation_key",
        ),
    )
    op.create_index("ix_idempotency_created_at", "idempotency_records", ["created_at"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            """
            CREATE FUNCTION mkt53_reject_audit_mutation()
            RETURNS trigger AS $$
            BEGIN
              RAISE EXCEPTION 'audit_events are append-only';
            END;
            $$ LANGUAGE plpgsql
            """
        )
        op.execute(
            """
            CREATE TRIGGER audit_events_append_only
            BEFORE UPDATE OR DELETE ON audit_events
            FOR EACH ROW EXECUTE FUNCTION mkt53_reject_audit_mutation()
            """
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events")
        op.execute("DROP FUNCTION IF EXISTS mkt53_reject_audit_mutation()")
    op.drop_index("ix_idempotency_created_at", table_name="idempotency_records")
    op.drop_table("idempotency_records")
    op.drop_index("ix_audit_events_request_id", table_name="audit_events")
    op.drop_index("ix_audit_events_entity", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("ix_sources_verification_status", table_name="sources")
    op.drop_index("ix_sources_module_status", table_name="sources")
    op.drop_table("sources")
