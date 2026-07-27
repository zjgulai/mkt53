from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from mkt53_backend.models import Snapshot
from tests.test_source_registry_api import create_source, reviewer_headers

FIXTURE_DIR = Path(__file__).parent / "fixtures/snapshots"


def snapshot_payload(snapshot_id: str = "snap-local-001") -> dict[str, object]:
    artifact = (FIXTURE_DIR / "local-sample.csv").read_bytes()
    schema = (FIXTURE_DIR / "schema-v1.json").read_bytes()
    return {
        "id": snapshot_id,
        "sourceId": "ds-local-001",
        "windowStart": "2026-07-01",
        "windowEnd": "2026-07-02",
        "rowCount": 2,
        "artifactUri": "fixture://be04/local-sample.csv",
        "artifactSha256": hashlib.sha256(artifact).hexdigest(),
        "artifactSizeBytes": len(artifact),
        "contentType": "text/csv",
        "schemaVersion": "1.0.0",
        "schemaSha256": hashlib.sha256(schema).hexdigest(),
        "collectedAt": "2026-07-24T02:00:00Z",
    }


def create_snapshot(
    client: TestClient,
    trusted_headers: dict[str, str],
    *,
    key: str = "snapshot-create-0001",
    payload: dict[str, object] | None = None,
):
    return client.post(
        "/api/v1/snapshots",
        headers=reviewer_headers(trusted_headers, key),
        json=payload or snapshot_payload(),
    )


def seed_source(client: TestClient, trusted_headers: dict[str, str]) -> None:
    response = create_source(client, trusted_headers, key="snapshot-source-0001")
    assert response.status_code == 201


def test_snapshot_read_and_write_permissions(client: TestClient, trusted_headers: dict[str, str]) -> None:
    viewer = client.get("/api/v1/snapshots", headers=trusted_headers)
    assert viewer.status_code == 403

    analyst_headers = {**trusted_headers, "X-Portal-Roles": "analyst"}
    analyst = client.get("/api/v1/snapshots", headers=analyst_headers)
    assert analyst.status_code == 200
    assert analyst.json() == {"items": [], "total": 0, "limit": 50, "offset": 0}

    denied_write = client.post(
        "/api/v1/snapshots",
        headers={**analyst_headers, "Idempotency-Key": "analyst-snapshot-0001"},
        json=snapshot_payload(),
    )
    assert denied_write.status_code == 403


def test_snapshot_create_hashes_audit_and_idempotency_are_deterministic(
    client: TestClient,
    trusted_headers: dict[str, str],
) -> None:
    seed_source(client, trusted_headers)

    missing_key = client.post(
        "/api/v1/snapshots",
        headers=reviewer_headers(trusted_headers),
        json=snapshot_payload(),
    )
    assert missing_key.status_code == 400

    created = create_snapshot(client, trusted_headers)
    assert created.status_code == 201
    assert created.headers["location"] == "/api/v1/snapshots/snap-local-001"
    assert created.json()["metadataHashVersion"] == "mkt53.snapshot-metadata.v1"

    payload = snapshot_payload()
    canonical = {
        "artifactSha256": payload["artifactSha256"],
        "artifactSizeBytes": payload["artifactSizeBytes"],
        "artifactUri": payload["artifactUri"],
        "collectedAt": "2026-07-24T02:00:00Z",
        "contentType": payload["contentType"],
        "hashVersion": "mkt53.snapshot-metadata.v1",
        "rowCount": payload["rowCount"],
        "schemaSha256": payload["schemaSha256"],
        "schemaVersion": payload["schemaVersion"],
        "sourceId": payload["sourceId"],
        "windowEnd": payload["windowEnd"],
        "windowStart": payload["windowStart"],
    }
    expected_hash = hashlib.sha256(
        json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    assert created.json()["metadataSha256"] == expected_hash
    assert created.headers["etag"] == f'"snapshot:snap-local-001:{expected_hash}"'

    replay = create_snapshot(client, trusted_headers)
    assert replay.status_code == 201
    assert replay.headers["idempotent-replayed"] == "true"
    assert replay.json() == created.json()

    changed = deepcopy(payload)
    changed["rowCount"] = 3
    conflict = create_snapshot(client, trusted_headers, payload=changed)
    assert conflict.status_code == 409
    assert conflict.json() == {"detail": "idempotency_key_reused_with_different_payload"}

    fetched = client.get(
        "/api/v1/snapshots/snap-local-001",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert fetched.status_code == 200
    assert fetched.headers["etag"] == created.headers["etag"]

    audit = client.get(
        "/api/v1/snapshots/snap-local-001/audit",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert audit.status_code == 200
    assert [event["action"] for event in audit.json()] == ["create"]
    assert audit.json()[0]["entityType"] == "snapshot"
    assert audit.json()[0]["afterState"]["metadataSha256"] == expected_hash


def test_duplicate_imports_replay_existing_snapshot_without_duplicate_audit(
    client: TestClient,
    trusted_headers: dict[str, str],
) -> None:
    seed_source(client, trusted_headers)
    created = create_snapshot(client, trusted_headers)
    assert created.status_code == 201

    same_id = create_snapshot(client, trusted_headers, key="snapshot-duplicate-0001")
    assert same_id.status_code == 200
    assert same_id.headers["idempotent-replayed"] == "true"

    other_id_payload = snapshot_payload("snap-local-duplicate")
    other_id = create_snapshot(
        client,
        trusted_headers,
        key="snapshot-duplicate-0002",
        payload=other_id_payload,
    )
    assert other_id.status_code == 200
    assert other_id.json()["id"] == "snap-local-001"
    assert other_id.headers["location"] == "/api/v1/snapshots/snap-local-001"

    fingerprint_conflict = deepcopy(other_id_payload)
    fingerprint_conflict["id"] = "snap-local-conflict"
    fingerprint_conflict["rowCount"] = 7
    conflict = create_snapshot(
        client,
        trusted_headers,
        key="snapshot-conflict-0001",
        payload=fingerprint_conflict,
    )
    assert conflict.status_code == 409
    assert conflict.json() == {"detail": "snapshot_fingerprint_conflict"}

    id_conflict = snapshot_payload()
    id_conflict["artifactSha256"] = "b" * 64
    collision = create_snapshot(
        client,
        trusted_headers,
        key="snapshot-conflict-0002",
        payload=id_conflict,
    )
    assert collision.status_code == 409
    assert collision.json() == {"detail": "snapshot_id_conflict"}

    listing = client.get(
        "/api/v1/snapshots?sourceId=ds-local-001&schemaVersion=1.0.0&windowStart=2026-07-02",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert listing.status_code == 200
    assert listing.json()["total"] == 1

    audit = client.get(
        "/api/v1/snapshots/snap-local-001/audit",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert [event["action"] for event in audit.json()] == ["create"]


def test_snapshot_import_rejects_missing_or_withdrawn_source_and_invalid_metadata(
    client: TestClient,
    trusted_headers: dict[str, str],
) -> None:
    missing = create_snapshot(client, trusted_headers)
    assert missing.status_code == 404
    assert missing.json() == {"detail": "source_not_found"}

    seed_source(client, trusted_headers)
    source = client.get(
        "/api/v1/sources/ds-local-001",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    withdrawn = client.post(
        "/api/v1/sources/ds-local-001/withdraw",
        headers={
            **reviewer_headers(trusted_headers, "snapshot-source-withdraw-0001"),
            "If-Match": source.headers["etag"],
        },
        json={"reason": "Snapshot source retired for local boundary test."},
    )
    assert withdrawn.status_code == 200

    blocked = create_snapshot(client, trusted_headers, key="snapshot-create-0002")
    assert blocked.status_code == 409
    assert blocked.json() == {"detail": "source_withdrawn_snapshot_import_forbidden"}

    invalid_window = snapshot_payload("snap-invalid-window")
    invalid_window["windowStart"] = "2026-07-03"
    invalid_window["windowEnd"] = "2026-07-01"
    assert (
        create_snapshot(
            client,
            trusted_headers,
            key="snapshot-invalid-0001",
            payload=invalid_window,
        ).status_code
        == 422
    )

    invalid_timezone = snapshot_payload("snap-invalid-timezone")
    invalid_timezone["collectedAt"] = "2026-07-24T02:00:00"
    assert (
        create_snapshot(
            client,
            trusted_headers,
            key="snapshot-invalid-0002",
            payload=invalid_timezone,
        ).status_code
        == 422
    )

    invalid_uri = snapshot_payload("snap-invalid-uri")
    invalid_uri["artifactUri"] = "file:///tmp/private.csv"
    assert (
        create_snapshot(
            client,
            trusted_headers,
            key="snapshot-invalid-0003",
            payload=invalid_uri,
        ).status_code
        == 422
    )


def test_snapshot_orm_rejects_update_and_delete(
    client: TestClient,
    trusted_headers: dict[str, str],
    session_factory: sessionmaker[Session],
) -> None:
    seed_source(client, trusted_headers)
    created = create_snapshot(client, trusted_headers)
    assert created.status_code == 201

    with session_factory() as session:
        snapshot = session.get(Snapshot, "snap-local-001")
        assert snapshot is not None
        snapshot.row_count = 3
        with pytest.raises(RuntimeError, match="immutable"):
            session.commit()
        session.rollback()

        persisted = session.get(Snapshot, "snap-local-001")
        assert persisted is not None
        session.delete(persisted)
        with pytest.raises(RuntimeError, match="immutable"):
            session.commit()

    no_patch = client.patch(
        "/api/v1/snapshots/snap-local-001",
        headers=reviewer_headers(trusted_headers, "snapshot-patch-0001"),
        json={"rowCount": 3},
    )
    assert no_patch.status_code == 405
