from __future__ import annotations

import pytest
from sqlalchemy.orm import Session, sessionmaker

from mkt53_backend.models import AuditEvent, ReviewEvent, ReviewSubject


def test_audit_event_rejects_orm_update_and_delete(session_factory: sessionmaker[Session]) -> None:
    with session_factory() as session:
        event = AuditEvent(
            entity_id="ds-local-audit",
            action="create",
            actor="user:audit-test",
            request_id="audit-test-request-0001",
            idempotency_key="audit-test-key-0001",
            before_state=None,
            after_state={"version": 1},
        )
        session.add(event)
        session.commit()

        event.action = "update"
        with pytest.raises(RuntimeError, match="append-only"):
            session.commit()
        session.rollback()

        persisted = session.get(AuditEvent, event.id)
        assert persisted is not None
        session.delete(persisted)
        with pytest.raises(RuntimeError, match="append-only"):
            session.commit()


def test_review_event_rejects_orm_update_and_delete(session_factory: sessionmaker[Session]) -> None:
    with session_factory() as session:
        review = ReviewSubject(entity_type="source", entity_id="ds-local-review-event")
        session.add(review)
        session.flush()
        event = ReviewEvent(
            review_subject_id=review.id,
            entity_type="source",
            entity_id=review.entity_id,
            from_state=None,
            to_state="pending",
            actor="user:review-test",
            reason="Review opened for append-only testing.",
            request_id="review-test-request-0001",
            idempotency_key="review-test-key-0001",
        )
        session.add(event)
        session.commit()

        event.reason = "This mutation must be rejected."
        with pytest.raises(RuntimeError, match="append-only"):
            session.commit()
        session.rollback()

        persisted = session.get(ReviewEvent, event.id)
        assert persisted is not None
        session.delete(persisted)
        with pytest.raises(RuntimeError, match="append-only"):
            session.commit()
