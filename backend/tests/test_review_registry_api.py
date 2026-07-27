from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from mkt53_backend.models import Source
from mkt53_backend.review_registry import ReviewError, ReviewRegistryService
from mkt53_backend.schemas import ReviewTransitionRequest, SourceCreate
from tests.test_snapshot_registry_api import create_snapshot, seed_source
from tests.test_source_registry_api import create_source, reviewer_headers, source_payload


def analyst_headers(trusted_headers: dict[str, str]) -> dict[str, str]:
    return {**trusted_headers, "X-Portal-Roles": "analyst"}


def transition_review(
    client: TestClient,
    trusted_headers: dict[str, str],
    *,
    entity_type: str,
    entity_id: str,
    etag: str | None,
    key: str | None,
    target_state: str,
    reason: str,
):
    headers = reviewer_headers(trusted_headers, key)
    if etag:
        headers["If-Match"] = etag
    return client.post(
        f"/api/v1/reviews/{entity_type}/{entity_id}/transitions",
        headers=headers,
        json={"targetState": target_state, "reason": reason},
    )


def test_review_permissions_and_creation_open_pending_reviews(
    client: TestClient,
    trusted_headers: dict[str, str],
) -> None:
    assert client.get("/api/v1/reviews", headers=trusted_headers).status_code == 403
    assert client.get("/api/v1/reviews", headers=analyst_headers(trusted_headers)).json()["total"] == 0

    denied_write = client.post(
        "/api/v1/reviews/source/ds-local-001/transitions",
        headers={
            **analyst_headers(trusted_headers),
            "If-Match": '"review:source:ds-local-001:v1"',
            "Idempotency-Key": "review-denied-0001",
        },
        json={"targetState": "approved", "reason": "Analyst cannot approve this review."},
    )
    assert denied_write.status_code == 403

    seed_source(client, trusted_headers)
    assert create_snapshot(client, trusted_headers).status_code == 201

    pending = client.get("/api/v1/reviews?state=pending", headers=analyst_headers(trusted_headers))
    assert pending.status_code == 200
    assert pending.json()["total"] == 2
    assert {(item["entityType"], item["entityId"]) for item in pending.json()["items"]} == {
        ("source", "ds-local-001"),
        ("snapshot", "snap-local-001"),
    }

    source_only = client.get(
        "/api/v1/reviews?entityType=source",
        headers=analyst_headers(trusted_headers),
    )
    assert source_only.json()["total"] == 1

    for entity_type, entity_id in (("source", "ds-local-001"), ("snapshot", "snap-local-001")):
        review = client.get(
            f"/api/v1/reviews/{entity_type}/{entity_id}",
            headers=analyst_headers(trusted_headers),
        )
        assert review.status_code == 200
        assert review.json()["state"] == "pending"
        assert review.json()["version"] == 1
        assert review.headers["etag"] == f'"review:{entity_type}:{entity_id}:v1"'

        events = client.get(
            f"/api/v1/reviews/{entity_type}/{entity_id}/events",
            headers=analyst_headers(trusted_headers),
        )
        assert events.status_code == 200
        assert len(events.json()) == 1
        assert events.json()[0]["fromState"] is None
        assert events.json()[0]["toState"] == "pending"
        assert events.json()[0]["actor"] == "user:be02-test"
        assert events.json()[0]["reason"] == f"Review opened when {entity_type} was created."
        assert events.json()[0]["occurredAt"] is not None


def test_source_review_approval_withdrawal_etag_and_idempotency(
    client: TestClient,
    trusted_headers: dict[str, str],
) -> None:
    assert create_source(client, trusted_headers).status_code == 201
    review = client.get(
        "/api/v1/reviews/source/ds-local-001",
        headers=analyst_headers(trusted_headers),
    )
    initial_etag = review.headers["etag"]

    missing_key = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-001",
        etag=initial_etag,
        key=None,
        target_state="approved",
        reason="Approved for the isolated BE-05 fixture only.",
    )
    assert missing_key.status_code == 400

    missing_etag = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-001",
        etag=None,
        key="review-source-approve-0001",
        target_state="approved",
        reason="Approved for the isolated BE-05 fixture only.",
    )
    assert missing_etag.status_code == 428

    approved = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-001",
        etag=initial_etag,
        key="review-source-approve-0001",
        target_state="approved",
        reason="Approved for the isolated BE-05 fixture only.",
    )
    assert approved.status_code == 200
    assert approved.json()["state"] == "approved"
    assert approved.json()["version"] == 2
    assert approved.headers["etag"] == '"review:source:ds-local-001:v2"'

    replay = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-001",
        etag=initial_etag,
        key="review-source-approve-0001",
        target_state="approved",
        reason="Approved for the isolated BE-05 fixture only.",
    )
    assert replay.status_code == 200
    assert replay.headers["idempotent-replayed"] == "true"
    assert replay.json() == approved.json()

    reused_key = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-001",
        etag=approved.headers["etag"],
        key="review-source-approve-0001",
        target_state="withdrawn",
        reason="A different request must not reuse the approval key.",
    )
    assert reused_key.status_code == 409
    assert reused_key.json() == {"detail": "idempotency_key_reused_with_different_payload"}

    stale = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-001",
        etag=initial_etag,
        key="review-source-withdraw-0001",
        target_state="withdrawn",
        reason="Withdraw after the approval using a fresh review decision.",
    )
    assert stale.status_code == 412

    withdrawn = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-001",
        etag=approved.headers["etag"],
        key="review-source-withdraw-0001",
        target_state="withdrawn",
        reason="Withdraw after the approval using a fresh review decision.",
    )
    assert withdrawn.status_code == 200
    assert withdrawn.json()["state"] == "withdrawn"
    assert withdrawn.json()["version"] == 3

    illegal = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-001",
        etag=withdrawn.headers["etag"],
        key="review-source-illegal-0001",
        target_state="rejected",
        reason="A withdrawn review cannot be moved to rejected.",
    )
    assert illegal.status_code == 409
    assert illegal.json() == {"detail": "illegal_review_transition"}

    events = client.get(
        "/api/v1/reviews/source/ds-local-001/events",
        headers=analyst_headers(trusted_headers),
    ).json()
    assert [event["toState"] for event in events] == ["pending", "approved", "withdrawn"]
    assert [event["fromState"] for event in events] == [None, "pending", "approved"]
    assert all(event["actor"] == "user:be02-test" for event in events)
    assert all(event["reason"] and event["occurredAt"] for event in events)


def test_snapshot_review_rejection_then_withdrawal_and_illegal_jump(
    client: TestClient,
    trusted_headers: dict[str, str],
) -> None:
    seed_source(client, trusted_headers)
    assert create_snapshot(client, trusted_headers).status_code == 201
    review = client.get(
        "/api/v1/reviews/snapshot/snap-local-001",
        headers=analyst_headers(trusted_headers),
    )

    rejected = transition_review(
        client,
        trusted_headers,
        entity_type="snapshot",
        entity_id="snap-local-001",
        etag=review.headers["etag"],
        key="review-snapshot-reject-0001",
        target_state="rejected",
        reason="Rejected because this remains a local-only fixture.",
    )
    assert rejected.status_code == 200
    assert rejected.json()["state"] == "rejected"

    cannot_approve = transition_review(
        client,
        trusted_headers,
        entity_type="snapshot",
        entity_id="snap-local-001",
        etag=rejected.headers["etag"],
        key="review-snapshot-illegal-0001",
        target_state="approved",
        reason="Rejected reviews cannot be silently approved later.",
    )
    assert cannot_approve.status_code == 409

    withdrawn = transition_review(
        client,
        trusted_headers,
        entity_type="snapshot",
        entity_id="snap-local-001",
        etag=rejected.headers["etag"],
        key="review-snapshot-withdraw-0001",
        target_state="withdrawn",
        reason="Withdraw the rejected local fixture from consideration.",
    )
    assert withdrawn.status_code == 200
    assert withdrawn.json()["state"] == "withdrawn"

    source_review = client.get(
        "/api/v1/reviews/source/ds-local-001",
        headers=analyst_headers(trusted_headers),
    )
    assert source_review.json()["state"] == "pending"


def test_pending_review_can_be_withdrawn_directly(
    client: TestClient,
    trusted_headers: dict[str, str],
) -> None:
    payload = source_payload("ds-local-direct-withdraw")
    assert (
        create_source(
            client,
            trusted_headers,
            key="review-direct-source-0001",
            payload=payload,
        ).status_code
        == 201
    )
    review = client.get(
        "/api/v1/reviews/source/ds-local-direct-withdraw",
        headers=analyst_headers(trusted_headers),
    )
    withdrawn = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-direct-withdraw",
        etag=review.headers["etag"],
        key="review-direct-withdraw-0001",
        target_state="withdrawn",
        reason="Withdraw this pending local fixture without approving it.",
    )
    assert withdrawn.status_code == 200
    assert withdrawn.json()["state"] == "withdrawn"
    assert withdrawn.json()["version"] == 2


def test_source_update_reopens_approval_and_lifecycle_withdraw_syncs_review(
    client: TestClient,
    trusted_headers: dict[str, str],
) -> None:
    created = create_source(
        client,
        trusted_headers,
        key="review-reopen-source-0001",
        payload=source_payload("ds-local-review-reopen"),
    )
    review = client.get(
        "/api/v1/reviews/source/ds-local-review-reopen",
        headers=analyst_headers(trusted_headers),
    )
    approved = transition_review(
        client,
        trusted_headers,
        entity_type="source",
        entity_id="ds-local-review-reopen",
        etag=review.headers["etag"],
        key="review-reopen-approve-0001",
        target_state="approved",
        reason="Approve the source before testing metadata invalidation.",
    )
    assert approved.json()["state"] == "approved"

    updated = client.patch(
        "/api/v1/sources/ds-local-review-reopen",
        headers={
            **reviewer_headers(trusted_headers, "review-reopen-update-0001"),
            "If-Match": created.headers["etag"],
        },
        json={"note": "Metadata changed after approval; review must reopen."},
    )
    assert updated.status_code == 200
    reopened = client.get(
        "/api/v1/reviews/source/ds-local-review-reopen",
        headers=analyst_headers(trusted_headers),
    )
    assert reopened.json()["state"] == "pending"
    assert reopened.json()["version"] == 3

    withdrawn_source = client.post(
        "/api/v1/sources/ds-local-review-reopen/withdraw",
        headers={
            **reviewer_headers(trusted_headers, "review-reopen-withdraw-0001"),
            "If-Match": updated.headers["etag"],
        },
        json={"reason": "Withdraw the source and its pending review together."},
    )
    assert withdrawn_source.status_code == 200
    withdrawn_review = client.get(
        "/api/v1/reviews/source/ds-local-review-reopen",
        headers=analyst_headers(trusted_headers),
    )
    assert withdrawn_review.json()["state"] == "withdrawn"
    assert withdrawn_review.json()["version"] == 4

    events = client.get(
        "/api/v1/reviews/source/ds-local-review-reopen/events",
        headers=analyst_headers(trusted_headers),
    ).json()
    assert [event["toState"] for event in events] == ["pending", "approved", "pending", "withdrawn"]
    assert events[2]["reason"] == "Review reopened because source metadata changed."
    assert events[3]["reason"] == "Withdraw the source and its pending review together."


def test_concurrent_review_transition_cannot_silently_overwrite(
    client: TestClient,
    trusted_headers: dict[str, str],
    session_factory: sessionmaker[Session],
) -> None:
    assert (
        create_source(
            client,
            trusted_headers,
            key="review-race-source-0001",
            payload=source_payload("ds-local-review-race"),
        ).status_code
        == 201
    )

    session_a = session_factory()
    session_b = session_factory()
    try:
        service_a = ReviewRegistryService(session_a)
        service_b = ReviewRegistryService(session_b)
        review_a = service_a.get_review("source", "ds-local-review-race")
        review_b = service_b.get_review("source", "ds-local-review-race")
        assert review_a.version == review_b.version == 1
        etag = '"review:source:ds-local-review-race:v1"'

        first = service_a.transition(
            "source",
            "ds-local-review-race",
            ReviewTransitionRequest(
                targetState="approved",
                reason="First reviewer approves the isolated race fixture.",
            ),
            if_match=etag,
            actor="user:reviewer-a",
            request_id="review-race-request-a",
            idempotency_key="review-race-key-a",
        )
        assert first.body["state"] == "approved"

        with pytest.raises(ReviewError, match="etag_mismatch") as error:
            service_b.transition(
                "source",
                "ds-local-review-race",
                ReviewTransitionRequest(
                    targetState="rejected",
                    reason="Second stale reviewer must not overwrite approval.",
                ),
                if_match=etag,
                actor="user:reviewer-b",
                request_id="review-race-request-b",
                idempotency_key="review-race-key-b",
            )
        assert error.value.status_code == 412
    finally:
        session_a.close()
        session_b.close()


def test_review_validation_missing_entities_and_uninitialized_state_fail_closed(
    client: TestClient,
    trusted_headers: dict[str, str],
    session_factory: sessionmaker[Session],
) -> None:
    for entity_type, entity_id in (("source", "ds-local-999"), ("snapshot", "snap-local-999")):
        missing = client.get(
            f"/api/v1/reviews/{entity_type}/{entity_id}",
            headers=analyst_headers(trusted_headers),
        )
        assert missing.status_code == 404
        assert missing.json() == {"detail": f"{entity_type}_not_found"}

    invalid_pending = client.post(
        "/api/v1/reviews/source/ds-local-999/transitions",
        headers={
            **reviewer_headers(trusted_headers, "review-invalid-pending-0001"),
            "If-Match": '"review:source:ds-local-999:v1"',
        },
        json={"targetState": "pending", "reason": "Pending is not a decision target."},
    )
    assert invalid_pending.status_code == 422

    too_short = client.post(
        "/api/v1/reviews/source/ds-local-999/transitions",
        headers={
            **reviewer_headers(trusted_headers, "review-invalid-reason-0001"),
            "If-Match": '"review:source:ds-local-999:v1"',
        },
        json={"targetState": "approved", "reason": "short"},
    )
    assert too_short.status_code == 422

    with session_factory() as session:
        payload = SourceCreate.model_validate(source_payload("ds-local-uninitialized"))
        session.add(Source(**payload.model_dump()))
        session.commit()

    uninitialized = client.get(
        "/api/v1/reviews/source/ds-local-uninitialized",
        headers=analyst_headers(trusted_headers),
    )
    assert uninitialized.status_code == 409
    assert uninitialized.json() == {"detail": "review_state_not_initialized"}
