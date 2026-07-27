"""Create the review state machine and append-only review log.

Revision ID: 0004_be05_review_state_machine
Revises: 0003_be04_snapshot_metadata
Create Date: 2026-07-24
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_be05_review_state_machine"
down_revision: str | Sequence[str] | None = "0003_be04_snapshot_metadata"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _review_uuid(entity_type: str, entity_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mkt53:review:{entity_type}:{entity_id}"))


def _event_uuid(entity_type: str, entity_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mkt53:review-open:{entity_type}:{entity_id}"))


def upgrade() -> None:
    op.create_table(
        "review_subjects",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("entity_type", sa.String(length=16), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("entity_type IN ('source', 'snapshot')", name="ck_review_subjects_entity_type"),
        sa.CheckConstraint(
            "state IN ('pending', 'approved', 'rejected', 'withdrawn')",
            name="ck_review_subjects_state",
        ),
        sa.CheckConstraint("version >= 1", name="ck_review_subjects_version_positive"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entity_type", "entity_id", name="uq_review_subjects_entity"),
    )
    op.create_index(
        "ix_review_subjects_state_entity",
        "review_subjects",
        ["state", "entity_type", "updated_at"],
    )

    op.create_table(
        "review_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("review_subject_id", sa.String(length=36), nullable=False),
        sa.Column("entity_type", sa.String(length=16), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=False),
        sa.Column("from_state", sa.String(length=16), nullable=True),
        sa.Column("to_state", sa.String(length=16), nullable=False),
        sa.Column("actor", sa.String(length=128), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("request_id", sa.String(length=128), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("entity_type IN ('source', 'snapshot')", name="ck_review_events_entity_type"),
        sa.CheckConstraint(
            "from_state IS NULL OR from_state IN ('pending', 'approved', 'rejected', 'withdrawn')",
            name="ck_review_events_from_state",
        ),
        sa.CheckConstraint(
            "to_state IN ('pending', 'approved', 'rejected', 'withdrawn')",
            name="ck_review_events_to_state",
        ),
        sa.CheckConstraint("from_state IS NULL OR from_state <> to_state", name="ck_review_events_state_change"),
        sa.CheckConstraint("length(trim(reason)) >= 8", name="ck_review_events_reason_length"),
        sa.ForeignKeyConstraint(
            ["review_subject_id"],
            ["review_subjects.id"],
            name="fk_review_events_review_subject",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_review_events_entity",
        "review_events",
        ["entity_type", "entity_id", "occurred_at"],
    )
    op.create_index(
        "ix_review_events_subject",
        "review_events",
        ["review_subject_id", "occurred_at"],
    )
    op.create_index("ix_review_events_request_id", "review_events", ["request_id"])

    bind = op.get_bind()
    pending_rows: list[dict[str, object]] = []
    event_rows: list[dict[str, object]] = []
    for entity_type, table_name, timestamp_column in (
        ("source", "sources", "created_at"),
        ("snapshot", "snapshots", "imported_at"),
    ):
        rows = bind.execute(sa.text(f"SELECT id, {timestamp_column} AS opened_at FROM {table_name}"))
        for row in rows.mappings():
            entity_id = str(row["id"])
            opened_at = row["opened_at"]
            subject_id = _review_uuid(entity_type, entity_id)
            pending_rows.append(
                {
                    "id": subject_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "state": "pending",
                    "version": 1,
                    "created_at": opened_at,
                    "updated_at": opened_at,
                }
            )
            event_rows.append(
                {
                    "id": _event_uuid(entity_type, entity_id),
                    "review_subject_id": subject_id,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "from_state": None,
                    "to_state": "pending",
                    "actor": "system:migration:0004",
                    "reason": "Backfilled as pending by migration 0004.",
                    "request_id": f"migration:0004:{entity_type}",
                    "idempotency_key": f"migration:0004:{entity_type}",
                    "occurred_at": opened_at,
                }
            )

    if pending_rows:
        op.bulk_insert(
            sa.table(
                "review_subjects",
                sa.column("id", sa.String()),
                sa.column("entity_type", sa.String()),
                sa.column("entity_id", sa.String()),
                sa.column("state", sa.String()),
                sa.column("version", sa.Integer()),
                sa.column("created_at", sa.DateTime(timezone=True)),
                sa.column("updated_at", sa.DateTime(timezone=True)),
            ),
            pending_rows,
        )
        op.bulk_insert(
            sa.table(
                "review_events",
                sa.column("id", sa.String()),
                sa.column("review_subject_id", sa.String()),
                sa.column("entity_type", sa.String()),
                sa.column("entity_id", sa.String()),
                sa.column("from_state", sa.String()),
                sa.column("to_state", sa.String()),
                sa.column("actor", sa.String()),
                sa.column("reason", sa.Text()),
                sa.column("request_id", sa.String()),
                sa.column("idempotency_key", sa.String()),
                sa.column("occurred_at", sa.DateTime(timezone=True)),
            ),
            event_rows,
        )

    if bind.dialect.name == "postgresql":
        op.execute(
            """
            CREATE FUNCTION mkt53_reject_review_event_mutation()
            RETURNS trigger AS $$
            BEGIN
              RAISE EXCEPTION 'review_events are append-only';
            END;
            $$ LANGUAGE plpgsql
            """
        )
        op.execute(
            """
            CREATE TRIGGER review_events_append_only
            BEFORE UPDATE OR DELETE ON review_events
            FOR EACH ROW EXECUTE FUNCTION mkt53_reject_review_event_mutation()
            """
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS review_events_append_only ON review_events")
        op.execute("DROP FUNCTION IF EXISTS mkt53_reject_review_event_mutation()")
    op.drop_index("ix_review_events_request_id", table_name="review_events")
    op.drop_index("ix_review_events_subject", table_name="review_events")
    op.drop_index("ix_review_events_entity", table_name="review_events")
    op.drop_table("review_events")
    op.drop_index("ix_review_subjects_state_entity", table_name="review_subjects")
    op.drop_table("review_subjects")
