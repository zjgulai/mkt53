from __future__ import annotations

from contextlib import nullcontext
from unittest.mock import Mock

import pytest
from sqlalchemy.exc import OperationalError

from mkt53_backend.config import Settings
from mkt53_backend.database import EXPECTED_ALEMBIC_REVISION, DatabaseReadinessProbe


@pytest.mark.parametrize(
    ("revision", "expected_ready", "expected_migration"),
    [
        (EXPECTED_ALEMBIC_REVISION, True, "current"),
        ("older_revision", False, "stale"),
    ],
)
def test_database_readiness_revision_contract(
    monkeypatch: pytest.MonkeyPatch,
    settings: Settings,
    revision: str,
    expected_ready: bool,
    expected_migration: str,
) -> None:
    connection = Mock()
    connection.execute.side_effect = [Mock(), Mock(scalar_one_or_none=Mock(return_value=revision))]
    engine = Mock()
    engine.connect.return_value = nullcontext(connection)
    monkeypatch.setattr("mkt53_backend.database.create_engine", Mock(return_value=engine))

    result = DatabaseReadinessProbe(settings)()

    assert result.ready is expected_ready
    assert result.database == "ready"
    assert result.migration == expected_migration
    engine.dispose.assert_called_once_with()


def test_database_readiness_redacts_sqlalchemy_error(monkeypatch: pytest.MonkeyPatch, settings: Settings) -> None:
    error = OperationalError("statement", {}, RuntimeError("secret host and password"))
    engine = Mock()
    engine.connect.side_effect = error
    monkeypatch.setattr("mkt53_backend.database.create_engine", Mock(return_value=engine))

    result = DatabaseReadinessProbe(settings)()

    assert result.ready is False
    assert result.database == "unavailable"
    assert result.migration == "unknown"
    assert result.reason == "OperationalError"
    engine.dispose.assert_called_once_with()
