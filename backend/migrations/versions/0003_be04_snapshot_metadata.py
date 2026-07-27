"""Create immutable snapshot metadata.

Revision ID: 0003_be04_snapshot_metadata
Revises: 0002_be03_source_registry
Create Date: 2026-07-24
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_be04_snapshot_metadata"
down_revision: str | Sequence[str] | None = "0002_be03_source_registry"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "idempotency_records",
        "operation",
        existing_type=sa.String(length=64),
        type_=sa.String(length=256),
        existing_nullable=False,
    )
    op.create_table(
        "snapshots",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("source_id", sa.String(length=128), nullable=False),
        sa.Column("window_start", sa.Date(), nullable=False),
        sa.Column("window_end", sa.Date(), nullable=False),
        sa.Column("row_count", sa.BigInteger(), nullable=False),
        sa.Column("artifact_uri", sa.Text(), nullable=False),
        sa.Column("artifact_sha256", sa.String(length=64), nullable=False),
        sa.Column("artifact_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("schema_version", sa.String(length=64), nullable=False),
        sa.Column("schema_sha256", sa.String(length=64), nullable=False),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata_hash_version", sa.String(length=64), nullable=False),
        sa.Column("metadata_sha256", sa.String(length=64), nullable=False),
        sa.Column("imported_by", sa.String(length=128), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("row_count >= 0", name="ck_snapshots_row_count_nonnegative"),
        sa.CheckConstraint("artifact_size_bytes >= 0", name="ck_snapshots_artifact_size_nonnegative"),
        sa.CheckConstraint("window_start <= window_end", name="ck_snapshots_window_order"),
        sa.CheckConstraint("length(artifact_sha256) = 64", name="ck_snapshots_artifact_sha256_length"),
        sa.CheckConstraint("length(schema_sha256) = 64", name="ck_snapshots_schema_sha256_length"),
        sa.CheckConstraint("length(metadata_sha256) = 64", name="ck_snapshots_metadata_sha256_length"),
        sa.ForeignKeyConstraint(
            ["source_id"],
            ["sources.id"],
            name="fk_snapshots_source_id_sources",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_id",
            "artifact_sha256",
            "schema_version",
            name="uq_snapshots_source_artifact_schema",
        ),
        sa.UniqueConstraint("metadata_sha256", name="uq_snapshots_metadata_sha256"),
    )
    op.create_index(
        "ix_snapshots_source_window",
        "snapshots",
        ["source_id", "window_start", "window_end"],
    )
    op.create_index("ix_snapshots_imported_at", "snapshots", ["imported_at"])

    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            """
            CREATE FUNCTION mkt53_reject_snapshot_mutation()
            RETURNS trigger AS $$
            BEGIN
              RAISE EXCEPTION 'snapshots are immutable';
            END;
            $$ LANGUAGE plpgsql
            """
        )
        op.execute(
            """
            CREATE TRIGGER snapshots_immutable
            BEFORE UPDATE OR DELETE ON snapshots
            FOR EACH ROW EXECUTE FUNCTION mkt53_reject_snapshot_mutation()
            """
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS snapshots_immutable ON snapshots")
        op.execute("DROP FUNCTION IF EXISTS mkt53_reject_snapshot_mutation()")
    op.drop_index("ix_snapshots_imported_at", table_name="snapshots")
    op.drop_index("ix_snapshots_source_window", table_name="snapshots")
    op.drop_table("snapshots")
    op.alter_column(
        "idempotency_records",
        "operation",
        existing_type=sa.String(length=256),
        type_=sa.String(length=64),
        existing_nullable=False,
    )
