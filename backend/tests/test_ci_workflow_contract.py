from pathlib import Path
from typing import Any

import yaml

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = REPOSITORY_ROOT / ".github" / "workflows" / "quality-gate.yml"
SETUP_UV_ACTION = "astral-sh/setup-uv@c771a70e6277c0a99b617c7a806ffedaca235ff9"


def _load_workflow() -> dict[str, Any]:
    workflow = yaml.safe_load(WORKFLOW_PATH.read_text(encoding="utf-8"))
    assert isinstance(workflow, dict)
    return workflow


def _find_step(steps: list[dict[str, Any]], name: str) -> dict[str, Any]:
    return next(step for step in steps if step.get("name") == name)


def test_backend_ci_runs_the_frozen_be07_gate_without_external_mutations() -> None:
    workflow = _load_workflow()

    assert workflow["permissions"] == {"contents": "read"}

    backend_job = workflow["jobs"]["backend"]
    assert backend_job["runs-on"] == "ubuntu-latest"
    assert backend_job["timeout-minutes"] == 30
    assert backend_job["defaults"]["run"]["working-directory"] == "backend"
    assert "environment" not in backend_job

    steps = backend_job["steps"]
    setup_step = _find_step(steps, "Set up uv and Python")
    assert setup_step["uses"] == SETUP_UV_ACTION
    assert setup_step["with"] == {
        "version": "0.11.11",
        "python-version": "3.12.13",
        "working-directory": "backend",
        "enable-cache": True,
        "cache-dependency-glob": "backend/uv.lock",
    }

    assert _find_step(steps, "Sync frozen backend dependencies")["run"] == "uv sync --frozen"
    assert _find_step(steps, "Run BE-07 backend quality gate")["run"] == "./scripts/quality-be07.sh"

    run_commands = "\n".join(str(step.get("run", "")) for step in steps).lower()
    for forbidden_command in (
        "ssh ",
        "rsync",
        "deploy:prod",
        "crontab",
        "data:refresh:semi-monthly",
        "docker compose up",
    ):
        assert forbidden_command not in run_commands


def test_backend_ci_preserves_recovery_report_and_cleanup_evidence() -> None:
    backend_steps = _load_workflow()["jobs"]["backend"]["steps"]
    artifact_step = _find_step(backend_steps, "Upload BE-07 recovery evidence")

    assert artifact_step["if"] == "always()"
    assert artifact_step["uses"] == "actions/upload-artifact@v7"
    assert artifact_step["with"]["name"] == "mkt53-backend-be07-evidence"
    assert artifact_step["with"]["if-no-files-found"] == "warn"
    assert artifact_step["with"]["retention-days"] == 14

    artifact_paths = artifact_step["with"]["path"].splitlines()
    assert artifact_paths == [
        "tmp/backend-recovery/be07/**/report.json",
        "tmp/backend-recovery/be07/**/cleanup.json",
    ]
