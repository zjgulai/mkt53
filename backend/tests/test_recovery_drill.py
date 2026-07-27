from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest
from pydantic import SecretStr
from sqlalchemy.orm import Session, sessionmaker

from mkt53_backend.config import AppEnvironment, Settings

ROOT = Path(__file__).resolve().parents[1]
HELPER_PATH = ROOT / "scripts/recovery_drill_be07.py"
SPEC = importlib.util.spec_from_file_location("recovery_drill_be07", HELPER_PATH)
assert SPEC is not None and SPEC.loader is not None
drill = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(drill)


def isolated_settings(database_name: str = drill.SOURCE_DATABASE) -> Settings:
    return Settings(
        app_env=AppEnvironment.TEST,
        database_host="postgres",
        database_name=database_name,
        database_user="mkt53",
        database_password=SecretStr("fixture-only-be07-database-password"),
        trusted_proxy_token=SecretStr("fixture-only-be07-proxy-token-more-than-32-characters"),
    )


def test_recovery_helper_accepts_only_allowlisted_test_databases() -> None:
    drill.assert_isolated_settings(isolated_settings())
    drill.assert_isolated_settings(isolated_settings(drill.RESTORE_DATABASE))

    for settings in (
        isolated_settings("mkt53"),
        isolated_settings("production"),
        Settings(
            app_env=AppEnvironment.DEVELOPMENT,
            database_host="postgres",
            database_name=drill.SOURCE_DATABASE,
            database_user="mkt53",
        ),
        Settings(
            app_env=AppEnvironment.TEST,
            database_host="101.34.52.232",
            database_name=drill.SOURCE_DATABASE,
            database_user="mkt53",
        ),
    ):
        with pytest.raises(RuntimeError, match="isolation boundary rejected"):
            drill.assert_isolated_settings(settings)


def test_seed_withdraw_and_replay_are_deterministic(session_factory: sessionmaker[Session]) -> None:
    with session_factory() as session:
        seeded = drill.seed_database(session)
        assert seeded["status"] == "passed"
        assert seeded["sourceCreateReplay"] is True
        assert seeded["snapshotCreateReplay"] is True
        assert seeded["sourceApproval"] == {"initialReplay": False, "exactReplay": True}
        assert seeded["snapshotApproval"] == {"initialReplay": False, "exactReplay": True}
        assert seeded["fingerprint"]["counts"] == {
            "sources": 1,
            "audit_events": 2,
            "idempotency_records": 4,
            "snapshots": 1,
            "review_subjects": 2,
            "review_events": 4,
        }

        mutated = drill.withdraw_and_replay(session)
        assert mutated["exactReplay"] is True
        assert mutated["sourceAuditActions"] == ["create", "withdraw"]
        assert mutated["sourceReviewTargets"] == ["pending", "approved", "withdrawn"]
        assert mutated["fingerprint"]["counts"]["audit_events"] == 3
        assert mutated["fingerprint"]["counts"]["review_events"] == 5
        assert mutated["fingerprint"]["counts"]["idempotency_records"] == 5


def test_append_only_probe_covers_update_and_delete_for_all_immutable_tables() -> None:
    statements = drill.append_only_statements()
    assert set(statements) == {
        "auditUpdate",
        "auditDelete",
        "reviewUpdate",
        "reviewDelete",
        "snapshotUpdate",
        "snapshotDelete",
    }
    assert all("UPDATE" in statement or "DELETE" in statement for statement, _ in statements.values())
    assert {message for _, message in statements.values()} == {
        "audit_events are append-only",
        "review_events are append-only",
        "snapshots are immutable",
    }


def test_cleanup_result_fails_closed_on_any_residue() -> None:
    assert drill.cleanup_result(0, 0, 0)["passed"] is True
    assert drill.cleanup_result(1, 0, 0)["passed"] is False
    assert drill.cleanup_result(0, 1, 0)["passed"] is False
    assert drill.cleanup_result(0, 0, 1)["passed"] is False


def test_shell_orchestrator_has_local_only_fail_closed_contract() -> None:
    shell = (ROOT / "scripts/recovery-drill-be07.sh").read_text(encoding="utf-8")
    override = (ROOT / "compose.recovery-drill.yaml").read_text(encoding="utf-8")
    assert "unix://*|npipe://*" in shell
    assert 'MKT53_APP_ENV="test"' in shell
    assert 'SOURCE_DATABASE="mkt53_be07_source"' in shell
    assert 'RESTORE_DATABASE="mkt53_be07_restore"' in shell
    assert "--no-owner --no-acl" in shell
    assert "down --volumes --remove-orphans" in shell
    assert "ssh " not in shell
    assert "rsync " not in shell
    assert "curl " not in shell
    assert "internal: true" in override
