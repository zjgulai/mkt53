from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient


def source_payload(source_id: str = "ds-local-001") -> dict[str, object]:
    return {
        "id": source_id,
        "module": "BE-03 local",
        "page": "DataSourcePage",
        "metric": "Local source registry contract",
        "sourceName": "Local fixture",
        "sourceUrl": "https://example.com/source-contract",
        "sourceType": "fixture",
        "year": "2026-07",
        "reliability": "B",
        "verificationStatus": "needs-review",
        "lastVerified": "2026-07-24",
        "note": "Local-only BE-03 test record.",
        "gap": "No production connector.",
        "action": "Keep isolated.",
        "privacyLevel": "public",
        "collectionMethod": "local-file-check",
        "evidenceGrade": "L2-fixture-or-dry-run",
        "canDisplayAsFact": False,
        "blockingReason": "local-test-only",
        "evidenceArtifactPath": "backend/tests/test_source_registry_api.py",
        "claimScope": "local API contract only",
        "owner": "team:data-governance",
    }


def reviewer_headers(trusted_headers: dict[str, str], key: str | None = None) -> dict[str, str]:
    headers = {**trusted_headers, "X-Portal-Roles": "reviewer"}
    if key:
        headers["Idempotency-Key"] = key
    return headers


def create_source(
    client: TestClient,
    trusted_headers: dict[str, str],
    *,
    key: str = "create-local-0001",
    payload: dict[str, object] | None = None,
):
    return client.post(
        "/api/v1/sources",
        headers=reviewer_headers(trusted_headers, key),
        json=payload or source_payload(),
    )


def test_source_read_requires_source_permission(client: TestClient, trusted_headers: dict[str, str]) -> None:
    denied = client.get("/api/v1/sources", headers=trusted_headers)
    assert denied.status_code == 403

    allowed = client.get(
        "/api/v1/sources",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert allowed.status_code == 200
    assert allowed.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}

    denied_write = client.post(
        "/api/v1/sources",
        headers={
            **trusted_headers,
            "X-Portal-Roles": "analyst",
            "Idempotency-Key": "analyst-create-0001",
        },
        json=source_payload(),
    )
    assert denied_write.status_code == 403


def test_source_create_is_versioned_audited_and_idempotent(client: TestClient, trusted_headers: dict[str, str]) -> None:
    missing_key = client.post(
        "/api/v1/sources",
        headers=reviewer_headers(trusted_headers),
        json=source_payload(),
    )
    assert missing_key.status_code == 400
    assert missing_key.json() == {"detail": "idempotency_key_required"}

    created = create_source(client, trusted_headers)
    assert created.status_code == 201
    assert created.headers["etag"] == '"source:ds-local-001:v1"'
    assert created.headers["location"] == "/api/v1/sources/ds-local-001"
    assert created.json()["version"] == 1
    assert created.json()["lifecycleStatus"] == "active"

    replay = create_source(client, trusted_headers)
    assert replay.status_code == 201
    assert replay.headers["idempotent-replayed"] == "true"
    assert replay.json() == created.json()

    duplicate = create_source(client, trusted_headers, key="create-local-duplicate-0001")
    assert duplicate.status_code == 409
    assert duplicate.json() == {"detail": "source_already_exists"}

    changed = deepcopy(source_payload())
    changed["metric"] = "A different request body"
    conflict = create_source(client, trusted_headers, payload=changed)
    assert conflict.status_code == 409
    assert conflict.json() == {"detail": "idempotency_key_reused_with_different_payload"}

    audit = client.get(
        "/api/v1/sources/ds-local-001/audit",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert audit.status_code == 200
    assert [event["action"] for event in audit.json()] == ["create"]
    assert audit.json()[0]["beforeState"] is None
    assert audit.json()[0]["afterState"]["version"] == 1


def test_update_requires_etag_rejects_stale_writes_and_replays_safely(
    client: TestClient, trusted_headers: dict[str, str]
) -> None:
    created = create_source(client, trusted_headers)
    assert created.status_code == 201

    headers = reviewer_headers(trusted_headers, "update-local-0001")
    missing_precondition = client.patch(
        "/api/v1/sources/ds-local-001",
        headers=headers,
        json={"note": "Reviewed locally."},
    )
    assert missing_precondition.status_code == 428

    stale = client.patch(
        "/api/v1/sources/ds-local-001",
        headers={**headers, "If-Match": '"source:ds-local-001:v0"'},
        json={"note": "Reviewed locally."},
    )
    assert stale.status_code == 412
    assert stale.json() == {"detail": "etag_mismatch"}

    updated = client.patch(
        "/api/v1/sources/ds-local-001",
        headers={**headers, "If-Match": created.headers["etag"]},
        json={"note": "Reviewed locally.", "verificationStatus": "verified"},
    )
    assert updated.status_code == 200
    assert updated.headers["etag"] == '"source:ds-local-001:v2"'
    assert updated.json()["note"] == "Reviewed locally."
    assert updated.json()["verificationStatus"] == "verified"

    replay = client.patch(
        "/api/v1/sources/ds-local-001",
        headers={**headers, "If-Match": created.headers["etag"]},
        json={"note": "Reviewed locally.", "verificationStatus": "verified"},
    )
    assert replay.status_code == 200
    assert replay.headers["idempotent-replayed"] == "true"
    assert replay.json() == updated.json()

    current = client.get(
        "/api/v1/sources/ds-local-001",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert current.status_code == 200
    assert current.headers["etag"] == updated.headers["etag"]

    audit = client.get(
        "/api/v1/sources/ds-local-001/audit",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert [event["action"] for event in audit.json()] == ["create", "update"]
    assert audit.json()[1]["beforeState"]["version"] == 1
    assert audit.json()[1]["afterState"]["version"] == 2


def test_withdraw_is_audited_and_hidden_from_default_listing(
    client: TestClient, trusted_headers: dict[str, str]
) -> None:
    created = create_source(client, trusted_headers)
    withdrawn = client.post(
        "/api/v1/sources/ds-local-001/withdraw",
        headers={
            **reviewer_headers(trusted_headers, "withdraw-local-0001"),
            "If-Match": created.headers["etag"],
        },
        json={"reason": "Superseded by a reviewed local source."},
    )
    assert withdrawn.status_code == 200
    assert withdrawn.headers["etag"] == '"source:ds-local-001:v2"'
    assert withdrawn.json()["lifecycleStatus"] == "withdrawn"
    assert withdrawn.json()["withdrawnAt"] is not None

    default_list = client.get("/api/v1/sources", headers={**trusted_headers, "X-Portal-Roles": "analyst"})
    assert default_list.json()["total"] == 0
    all_sources = client.get(
        "/api/v1/sources?includeWithdrawn=true",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert all_sources.json()["total"] == 1

    cannot_update = client.patch(
        "/api/v1/sources/ds-local-001",
        headers={
            **reviewer_headers(trusted_headers, "update-local-0002"),
            "If-Match": withdrawn.headers["etag"],
        },
        json={"note": "Must stay withdrawn."},
    )
    assert cannot_update.status_code == 409
    assert cannot_update.json() == {"detail": "source_already_withdrawn"}

    audit = client.get(
        "/api/v1/sources/ds-local-001/audit",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert [event["action"] for event in audit.json()] == ["create", "withdraw"]


def test_invalid_payloads_and_not_found_fail_closed(client: TestClient, trusted_headers: dict[str, str]) -> None:
    for index, source_url in enumerate(
        ("file:///tmp/not-allowed", "https://", "https://user:password@example.com/source", "https://bad host/source"),
        start=2,
    ):
        invalid_url = source_payload(f"ds-local-00{index}")
        invalid_url["sourceUrl"] = source_url
        response = create_source(
            client,
            trusted_headers,
            key=f"create-local-000{index}",
            payload=invalid_url,
        )
        assert response.status_code == 422

    empty_patch = client.patch(
        "/api/v1/sources/ds-local-999",
        headers={
            **reviewer_headers(trusted_headers, "update-local-9999"),
            "If-Match": '"source:ds-local-999:v1"',
        },
        json={},
    )
    assert empty_patch.status_code == 422

    missing = client.get(
        "/api/v1/sources/ds-local-999",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert missing.status_code == 404
    assert missing.json() == {"detail": "source_not_found"}

    missing_audit = client.get(
        "/api/v1/sources/ds-local-999/audit",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert missing_audit.status_code == 404
    assert missing_audit.json() == {"detail": "source_not_found"}
