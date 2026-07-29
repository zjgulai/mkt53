from __future__ import annotations

import pytest
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.orm.exc import StaleDataError

from mkt53_backend.models import Source, utc_now
from mkt53_backend.schemas import SourceCreate
from tests.test_source_registry_api import source_payload


def test_concurrent_source_update_cannot_silently_overwrite(
    session_factory: sessionmaker[Session],
) -> None:
    payload = SourceCreate.model_validate(source_payload("ds-local-race"))
    with session_factory() as seed_session:
        seed_session.add(Source(**payload.model_dump()))
        seed_session.commit()

    session_a = session_factory()
    session_b = session_factory()
    try:
        source_a = session_a.get(Source, payload.id)
        source_b = session_b.get(Source, payload.id)
        assert source_a is not None and source_b is not None
        assert source_a.version == source_b.version == 1

        source_a.note = "first writer"
        source_a.updated_at = utc_now()
        session_a.commit()
        assert source_a.version == 2

        source_b.note = "stale second writer"
        source_b.updated_at = utc_now()
        with pytest.raises(StaleDataError):
            session_b.commit()
        session_b.rollback()
    finally:
        session_a.close()
        session_b.close()

    with session_factory() as verification_session:
        current = verification_session.get(Source, payload.id)
        assert current is not None
        assert current.note == "first writer"
        assert current.version == 2
