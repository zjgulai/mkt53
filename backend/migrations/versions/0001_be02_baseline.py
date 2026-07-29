"""Create the BE-02 migration baseline without domain tables.

Revision ID: 0001_be02_baseline
Revises:
Create Date: 2026-07-24
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "0001_be02_baseline"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Establish only Alembic's version marker for BE-02."""


def downgrade() -> None:
    """No domain schema exists in the BE-02 baseline."""
