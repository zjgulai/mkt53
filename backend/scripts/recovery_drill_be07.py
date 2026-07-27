from __future__ import annotations

import argparse
import hashlib
import json
import re
import stat
import sys
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from mkt53_backend.config import AppEnvironment, Settings, get_settings
from mkt53_backend.database import EXPECTED_ALEMBIC_REVISION, DatabaseSessionManager
from mkt53_backend.models import AuditEvent, ReviewEvent, Snapshot, Source
from mkt53_backend.review_registry import ReviewRegistryService, review_etag
from mkt53_backend.schemas import ReviewTransitionRequest, SnapshotCreate, SourceCreate
from mkt53_backend.snapshot_registry import SnapshotRegistryService
from mkt53_backend.source_registry import SourceRegistryService, source_etag

SOURCE_DATABASE = "mkt53_be07_source"
RESTORE_DATABASE = "mkt53_be07_restore"
SOURCE_ID = "ds-be07-recovery"
SNAPSHOT_ID = "snap-be07-recovery"
ACTOR = "user:be07-recovery-drill"
WITHDRAW_REASON = "Withdrawn during the isolated BE-07 recovery drill."
RPO_TARGET_SECONDS = 24 * 60 * 60
RTO_TARGET_SECONDS = 4 * 60 * 60

TABLE_ORDER = {
    "sources": "id",
    "audit_events": "id",
    "idempotency_records": "id",
    "snapshots": "id",
    "review_subjects": "entity_type, entity_id",
    "review_events": "id",
}


def _json_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_value(item) for key, item in sorted(value.items())}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value


def _canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def source_payload() -> SourceCreate:
    return SourceCreate(
        id=SOURCE_ID,
        module="BE-07 local",
        page="DataSourcePage",
        metric="Isolated backup and recovery drill",
        source_name="BE-07 synthetic fixture",
        source_url="https://example.com/be07-recovery-fixture",
        source_type="fixture",
        year="2026-07",
        reliability="B",
        verification_status="needs-review",
        last_verified=date(2026, 7, 24),
        note="Synthetic local-only recovery record.",
        gap="No production database or connector.",
        action="Keep isolated and disposable.",
        privacy_level="public",
        collection_method="local-file-check",
        evidence_grade="L2-fixture-or-dry-run",
        can_display_as_fact=False,
        blocking_reason="local-recovery-drill-only",
        evidence_artifact_path="backend/scripts/recovery_drill_be07.py",
        claim_scope="BE-07 local backup and restore controls only",
        owner="team:qa-ops",
    )


def snapshot_payload() -> SnapshotCreate:
    artifact = b"mkt53-be07-local-recovery-fixture\n"
    schema = b'{"fields":["id","value"],"version":"be07"}\n'
    return SnapshotCreate(
        id=SNAPSHOT_ID,
        source_id=SOURCE_ID,
        window_start=date(2026, 7, 1),
        window_end=date(2026, 7, 2),
        row_count=2,
        artifact_uri="fixture://be07/recovery-fixture.csv",
        artifact_sha256=hashlib.sha256(artifact).hexdigest(),
        artifact_size_bytes=len(artifact),
        content_type="text/csv",
        schema_version="be07-v1",
        schema_sha256=hashlib.sha256(schema).hexdigest(),
        collected_at=datetime(2026, 7, 24, 2, 0, tzinfo=UTC),
    )


def assert_isolated_settings(settings: Settings) -> None:
    errors: list[str] = []
    if settings.app_env is not AppEnvironment.TEST:
        errors.append("MKT53_APP_ENV must be test")
    if settings.database_host != "postgres":
        errors.append("database host must be the isolated Compose service 'postgres'")
    if settings.database_name not in {SOURCE_DATABASE, RESTORE_DATABASE}:
        errors.append("database name is outside the BE-07 source/restore allowlist")
    if settings.database_user != "mkt53":
        errors.append("database user must be the fixture-only mkt53 role")
    if errors:
        raise RuntimeError("BE-07 isolation boundary rejected execution: " + "; ".join(errors))


def database_fingerprint(session: Session) -> dict[str, Any]:
    tables: dict[str, list[dict[str, Any]]] = {}
    timestamps: list[datetime] = []
    for table_name, order_by in TABLE_ORDER.items():
        rows = session.execute(text(f'SELECT * FROM "{table_name}" ORDER BY {order_by}')).mappings()
        normalized_rows: list[dict[str, Any]] = []
        for row in rows:
            for value in row.values():
                if isinstance(value, datetime):
                    timestamps.append(value)
            normalized_rows.append({key: _json_value(value) for key, value in sorted(row.items())})
        tables[table_name] = normalized_rows
    canonical = _canonical_json(tables)
    latest = max(timestamps).astimezone(UTC) if timestamps else None
    return {
        "sha256": hashlib.sha256(canonical).hexdigest(),
        "canonicalBytes": len(canonical),
        "counts": {table_name: len(rows) for table_name, rows in tables.items()},
        "latestCommittedAt": _json_value(latest),
    }


def _approve_review(session: Session, entity_type: str, entity_id: str, key: str) -> tuple[bool, bool]:
    service = ReviewRegistryService(session)
    review = service.get_review(entity_type, entity_id)
    etag = review_etag(review)
    payload = ReviewTransitionRequest(
        target_state="approved",
        reason=f"Approved for the isolated BE-07 {entity_type} recovery fixture.",
    )
    created = service.transition(
        entity_type,
        entity_id,
        payload,
        if_match=etag,
        actor=ACTOR,
        request_id=f"be07-approve-{entity_type}-request",
        idempotency_key=key,
    )
    replay = service.transition(
        entity_type,
        entity_id,
        payload,
        if_match=etag,
        actor=ACTOR,
        request_id=f"be07-approve-{entity_type}-replay",
        idempotency_key=key,
    )
    return created.replayed, replay.replayed


def seed_database(session: Session) -> dict[str, Any]:
    if any(session.scalar(select(model).limit(1)) is not None for model in (Source, Snapshot, AuditEvent, ReviewEvent)):
        raise RuntimeError("BE-07 source database is not empty")

    source_service = SourceRegistryService(session)
    source = source_service.create_source(
        source_payload(),
        actor=ACTOR,
        request_id="be07-source-create-request",
        idempotency_key="be07-source-create-v1",
    )
    source_replay = source_service.create_source(
        source_payload(),
        actor=ACTOR,
        request_id="be07-source-create-replay",
        idempotency_key="be07-source-create-v1",
    )

    snapshot_service = SnapshotRegistryService(session)
    snapshot = snapshot_service.create_snapshot(
        snapshot_payload(),
        actor=ACTOR,
        request_id="be07-snapshot-create-request",
        idempotency_key="be07-snapshot-create-v1",
    )
    snapshot_replay = snapshot_service.create_snapshot(
        snapshot_payload(),
        actor=ACTOR,
        request_id="be07-snapshot-create-replay",
        idempotency_key="be07-snapshot-create-v1",
    )

    source_approval = _approve_review(session, "source", SOURCE_ID, "be07-source-approve-v1")
    snapshot_approval = _approve_review(session, "snapshot", SNAPSHOT_ID, "be07-snapshot-approve-v1")
    fingerprint = database_fingerprint(session)
    expected_counts = {
        "sources": 1,
        "audit_events": 2,
        "idempotency_records": 4,
        "snapshots": 1,
        "review_subjects": 2,
        "review_events": 4,
    }
    if fingerprint["counts"] != expected_counts:
        raise RuntimeError(f"unexpected BE-07 seed counts: {fingerprint['counts']}")
    return {
        "phase": "seed",
        "status": "passed",
        "sourceCreated": source.status_code == 201 and not source.replayed,
        "sourceCreateReplay": source_replay.replayed,
        "snapshotCreated": snapshot.status_code == 201 and not snapshot.replayed,
        "snapshotCreateReplay": snapshot_replay.replayed,
        "sourceApproval": {"initialReplay": source_approval[0], "exactReplay": source_approval[1]},
        "snapshotApproval": {"initialReplay": snapshot_approval[0], "exactReplay": snapshot_approval[1]},
        "fingerprint": fingerprint,
    }


def withdraw_and_replay(session: Session) -> dict[str, Any]:
    source_service = SourceRegistryService(session)
    source = source_service.get_source(SOURCE_ID)
    original_etag = source_etag(source)
    withdrawn = source_service.withdraw_source(
        SOURCE_ID,
        WITHDRAW_REASON,
        if_match=original_etag,
        actor=ACTOR,
        request_id="be07-source-withdraw-request",
        idempotency_key="be07-source-withdraw-v1",
    )
    replay = source_service.withdraw_source(
        SOURCE_ID,
        WITHDRAW_REASON,
        if_match=original_etag,
        actor=ACTOR,
        request_id="be07-source-withdraw-replay",
        idempotency_key="be07-source-withdraw-v1",
    )
    audit_actions = [event.action for event in source_service.list_audit_events(SOURCE_ID)]
    review_service = ReviewRegistryService(session)
    review = review_service.get_review("source", SOURCE_ID)
    review_targets = [event.to_state for event in review_service.list_events("source", SOURCE_ID)]
    if audit_actions != ["create", "withdraw"]:
        raise RuntimeError(f"source audit replay duplicated or lost an event: {audit_actions}")
    if review_targets != ["pending", "approved", "withdrawn"]:
        raise RuntimeError(f"source review replay duplicated or lost an event: {review_targets}")
    if not replay.replayed or withdrawn.replayed:
        raise RuntimeError("source withdrawal idempotency contract failed")
    if review.state != "withdrawn":
        raise RuntimeError("source review was not linked to withdrawal")
    return {
        "phase": "withdraw-and-replay",
        "status": "passed",
        "initialReplay": withdrawn.replayed,
        "exactReplay": replay.replayed,
        "sourceLifecycle": withdrawn.body["lifecycleStatus"],
        "sourceAuditActions": audit_actions,
        "sourceReviewTargets": review_targets,
        "fingerprint": database_fingerprint(session),
    }


def _replay_seed_operations(session: Session) -> dict[str, bool]:
    source_replay = SourceRegistryService(session).create_source(
        source_payload(),
        actor=ACTOR,
        request_id="be07-restored-source-replay",
        idempotency_key="be07-source-create-v1",
    )
    snapshot_replay = SnapshotRegistryService(session).create_snapshot(
        snapshot_payload(),
        actor=ACTOR,
        request_id="be07-restored-snapshot-replay",
        idempotency_key="be07-snapshot-create-v1",
    )
    review_service = ReviewRegistryService(session)
    source_approval = review_service.transition(
        "source",
        SOURCE_ID,
        ReviewTransitionRequest(
            target_state="approved",
            reason="Approved for the isolated BE-07 source recovery fixture.",
        ),
        if_match='"review:source:ds-be07-recovery:v1"',
        actor=ACTOR,
        request_id="be07-restored-source-approval-replay",
        idempotency_key="be07-source-approve-v1",
    )
    snapshot_approval = review_service.transition(
        "snapshot",
        SNAPSHOT_ID,
        ReviewTransitionRequest(
            target_state="approved",
            reason="Approved for the isolated BE-07 snapshot recovery fixture.",
        ),
        if_match='"review:snapshot:snap-be07-recovery:v1"',
        actor=ACTOR,
        request_id="be07-restored-snapshot-approval-replay",
        idempotency_key="be07-snapshot-approve-v1",
    )
    return {
        "sourceCreate": source_replay.replayed,
        "snapshotCreate": snapshot_replay.replayed,
        "sourceApproval": source_approval.replayed,
        "snapshotApproval": snapshot_approval.replayed,
    }


def append_only_statements() -> dict[str, tuple[str, str]]:
    return {
        "auditUpdate": (
            "UPDATE audit_events SET actor = actor WHERE id = (SELECT id FROM audit_events ORDER BY id LIMIT 1)",
            "audit_events are append-only",
        ),
        "auditDelete": (
            "DELETE FROM audit_events WHERE id = (SELECT id FROM audit_events ORDER BY id LIMIT 1)",
            "audit_events are append-only",
        ),
        "reviewUpdate": (
            "UPDATE review_events SET actor = actor WHERE id = (SELECT id FROM review_events ORDER BY id LIMIT 1)",
            "review_events are append-only",
        ),
        "reviewDelete": (
            "DELETE FROM review_events WHERE id = (SELECT id FROM review_events ORDER BY id LIMIT 1)",
            "review_events are append-only",
        ),
        "snapshotUpdate": (
            "UPDATE snapshots SET row_count = row_count WHERE id = (SELECT id FROM snapshots ORDER BY id LIMIT 1)",
            "snapshots are immutable",
        ),
        "snapshotDelete": (
            "DELETE FROM snapshots WHERE id = (SELECT id FROM snapshots ORDER BY id LIMIT 1)",
            "snapshots are immutable",
        ),
    }


def verify_append_only_controls(session: Session) -> dict[str, bool]:
    outcomes: dict[str, bool] = {}
    for name, (statement, expected_message) in append_only_statements().items():
        try:
            session.execute(text(statement))
            session.commit()
        except DBAPIError as exc:
            session.rollback()
            outcomes[name] = expected_message in str(exc.orig)
        else:
            outcomes[name] = False
        if not outcomes[name]:
            raise RuntimeError(f"PostgreSQL append-only control failed: {name}")
    return outcomes


def verify_restored_database(session: Session, expected_fingerprint: str) -> dict[str, Any]:
    revision = session.scalar(text("SELECT version_num FROM alembic_version LIMIT 1"))
    if revision != EXPECTED_ALEMBIC_REVISION:
        raise RuntimeError(f"restored migration mismatch: {revision}")
    before = database_fingerprint(session)
    if before["sha256"] != expected_fingerprint:
        raise RuntimeError(
            f"restored logical fingerprint mismatch: expected {expected_fingerprint}, got {before['sha256']}"
        )

    counts_before_replay = before["counts"]
    replays = _replay_seed_operations(session)
    after_seed_replays = database_fingerprint(session)
    if not all(replays.values()) or after_seed_replays["counts"] != counts_before_replay:
        raise RuntimeError("restored idempotency records did not replay exactly")

    withdrawal = withdraw_and_replay(session)
    before_controls = database_fingerprint(session)
    append_only = verify_append_only_controls(session)
    after_controls = database_fingerprint(session)
    if before_controls != after_controls:
        raise RuntimeError("a rejected append-only mutation changed the restored database")

    return {
        "phase": "verify-restored",
        "status": "passed",
        "migrationRevision": revision,
        "baselineFingerprintMatched": True,
        "baseline": before,
        "restoredSeedReplays": replays,
        "countsStableAfterSeedReplays": True,
        "withdrawal": withdrawal,
        "appendOnly": append_only,
        "fingerprintStableAfterRejectedMutations": True,
        "finalFingerprint": after_controls,
    }


def _read_json(path: str) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def cleanup_result(containers: int, networks: int, volumes: int) -> dict[str, Any]:
    return {
        "containersRemaining": containers,
        "networksRemaining": networks,
        "volumesRemaining": volumes,
        "passed": containers == 0 and networks == 0 and volumes == 0,
    }


def build_report(args: argparse.Namespace) -> dict[str, Any]:
    seed = _read_json(args.seed)
    mutation = _read_json(args.mutation)
    restored = _read_json(args.restored)
    cleanup = _read_json(args.cleanup)
    backup_path = Path(args.backup).resolve()
    backup_bytes = backup_path.read_bytes()
    backup_completed = _parse_time(args.backup_completed_at)
    latest_commit = _parse_time(seed["fingerprint"]["latestCommittedAt"])
    rpo_seconds = max(0.0, (backup_completed - latest_commit).total_seconds())
    rto_seconds = float(args.rto_seconds)
    passed = (
        seed["status"] == "passed"
        and mutation["status"] == "passed"
        and restored["status"] == "passed"
        and cleanup["passed"]
        and rpo_seconds <= RPO_TARGET_SECONDS
        and rto_seconds <= RTO_TARGET_SECONDS
    )
    return {
        "schemaVersion": "mkt53.be07-recovery-drill.v1",
        "drillId": args.drill_id,
        "status": "passed" if passed else "failed",
        "evidenceGrade": "L2-fixture-or-dry-run",
        "scope": {
            "environment": "test",
            "databaseHost": "postgres",
            "sourceDatabase": SOURCE_DATABASE,
            "restoreDatabase": RESTORE_DATABASE,
            "localDockerSocketOnly": True,
            "allComposeNetworksInternal": True,
            "hostPortsPublished": False,
            "productionDatabaseRead": False,
            "productionDatabaseWrite": False,
            "productionConfigWrite": False,
            "productionTaskInstall": False,
            "providerOrConnectorCalls": 0,
            "deployment": False,
        },
        "startedAt": args.started_at,
        "completedAt": args.completed_at,
        "backup": {
            "path": str(backup_path),
            "format": "PostgreSQL custom logical archive",
            "sha256": hashlib.sha256(backup_bytes).hexdigest(),
            "sizeBytes": len(backup_bytes),
            "mode": f"{stat.S_IMODE(backup_path.stat().st_mode):04o}",
            "startedAt": args.backup_started_at,
            "completedAt": args.backup_completed_at,
            "durationSeconds": round(float(args.backup_duration_seconds), 6),
            "fixtureOnlyUnencrypted": True,
        },
        "recoveryObjectives": {
            "rpo": {
                "targetSeconds": RPO_TARGET_SECONDS,
                "measuredSeconds": round(rpo_seconds, 6),
                "passed": rpo_seconds <= RPO_TARGET_SECONDS,
                "definition": "backup completion minus latest committed fixture record included in the archive",
            },
            "rto": {
                "targetSeconds": RTO_TARGET_SECONDS,
                "measuredSeconds": round(rto_seconds, 6),
                "passed": rto_seconds <= RTO_TARGET_SECONDS,
                "definition": (
                    "create restore database through fingerprint, revision, replay, withdrawal, "
                    "and trigger verification"
                ),
            },
        },
        "seed": seed,
        "postBackupMutation": mutation,
        "restoreVerification": restored,
        "cleanup": cleanup,
        "limitations": [
            "Synthetic fixture data only; this is not a production backup or production recovery claim.",
            "The local custom archive is mode 0600 but intentionally not an encrypted off-host production copy.",
            "Measured RPO/RTO describe this local isolated run, not observed production service performance.",
        ],
    }


def _database_command(command: str, expected_fingerprint: str | None) -> dict[str, Any]:
    settings = get_settings()
    assert_isolated_settings(settings)
    manager = DatabaseSessionManager(settings)
    try:
        with manager.session_factory() as session:
            if command == "seed":
                return seed_database(session)
            if command == "mutate":
                return withdraw_and_replay(session)
            if command == "verify":
                if expected_fingerprint is None or not re.fullmatch(r"[a-f0-9]{64}", expected_fingerprint):
                    raise RuntimeError("verify requires the 64-character baseline fingerprint")
                return verify_restored_database(session, expected_fingerprint)
    finally:
        manager.dispose()
    raise RuntimeError(f"unknown database command: {command}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fail-closed BE-07 local recovery drill helper")
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in ("seed", "mutate"):
        subparsers.add_parser(command)
    verify = subparsers.add_parser("verify")
    verify.add_argument("expected_fingerprint")
    cleanup = subparsers.add_parser("cleanup")
    cleanup.add_argument("--containers", type=int, required=True)
    cleanup.add_argument("--networks", type=int, required=True)
    cleanup.add_argument("--volumes", type=int, required=True)
    report = subparsers.add_parser("report")
    for name in (
        "drill-id",
        "seed",
        "mutation",
        "restored",
        "cleanup",
        "backup",
        "started-at",
        "completed-at",
        "backup-started-at",
        "backup-completed-at",
        "backup-duration-seconds",
        "rto-seconds",
    ):
        report.add_argument(f"--{name}", required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.command in {"seed", "mutate", "verify"}:
        result = _database_command(args.command, getattr(args, "expected_fingerprint", None))
    elif args.command == "cleanup":
        result = cleanup_result(args.containers, args.networks, args.volumes)
    else:
        result = build_report(args)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if result.get("status", "passed") == "passed" and result.get("passed", True) else 1


if __name__ == "__main__":
    raise SystemExit(main())
