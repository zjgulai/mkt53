from __future__ import annotations

from pathlib import Path

from mkt53_backend.database import EXPECTED_ALEMBIC_REVISION


def test_expected_revision_matches_review_state_machine_file() -> None:
    migration = Path(__file__).resolve().parents[1] / "migrations/versions/0004_be05_review_state_machine.py"
    content = migration.read_text(encoding="utf-8")
    assert EXPECTED_ALEMBIC_REVISION == "0004_be05_review_state_machine"
    assert f'revision: str = "{EXPECTED_ALEMBIC_REVISION}"' in content
    assert 'down_revision: str | Sequence[str] | None = "0003_be04_snapshot_metadata"' in content
    assert "review_events_append_only" in content
    assert "BEFORE UPDATE OR DELETE ON review_events" in content
    assert "system:migration:0004" in content
