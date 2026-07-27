from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import TEST_PROXY_TOKEN


def test_missing_proxy_token_returns_401(client: TestClient) -> None:
    response = client.get(
        "/api/v1/authz/me",
        headers={"X-Portal-Subject": "user:viewer", "X-Portal-Roles": "viewer"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "authentication_required"}


def test_invalid_proxy_token_returns_401(client: TestClient) -> None:
    response = client.get(
        "/api/v1/authz/me",
        headers={
            "X-Mkt53-Proxy-Token": "invalid",
            "X-Portal-Subject": "user:viewer",
            "X-Portal-Roles": "viewer",
        },
    )
    assert response.status_code == 401


def test_missing_or_malformed_subject_returns_401(client: TestClient) -> None:
    common = {"X-Mkt53-Proxy-Token": TEST_PROXY_TOKEN, "X-Portal-Roles": "viewer"}
    assert client.get("/api/v1/authz/me", headers=common).status_code == 401
    assert (
        client.get(
            "/api/v1/authz/me",
            headers={**common, "X-Portal-Subject": "bad subject with spaces"},
        ).status_code
        == 401
    )


def test_missing_or_unknown_roles_returns_403(client: TestClient) -> None:
    common = {"X-Mkt53-Proxy-Token": TEST_PROXY_TOKEN, "X-Portal-Subject": "user:known"}
    assert client.get("/api/v1/authz/me", headers=common).status_code == 403
    assert client.get("/api/v1/authz/me", headers={**common, "X-Portal-Roles": "owner"}).status_code == 403


def test_viewer_can_read_identity_but_cannot_use_write_probe(
    client: TestClient, trusted_headers: dict[str, str]
) -> None:
    response = client.get("/api/v1/authz/me", headers=trusted_headers)
    assert response.status_code == 200
    assert response.json() == {
        "subject": "user:be02-test",
        "roles": ["viewer"],
        "permissions": ["health:read"],
    }

    denied = client.post("/api/v1/authz/write-probe", headers=trusted_headers)
    assert denied.status_code == 403
    assert denied.json() == {"detail": "insufficient_role"}


def test_analyst_cannot_use_write_probe(client: TestClient, trusted_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/authz/write-probe",
        headers={**trusted_headers, "X-Portal-Roles": "analyst"},
    )
    assert response.status_code == 403


def test_reviewer_and_admin_can_use_side_effect_free_write_probe(
    client: TestClient, trusted_headers: dict[str, str]
) -> None:
    for role in ("reviewer", "admin"):
        response = client.post(
            "/api/v1/authz/write-probe",
            headers={**trusted_headers, "X-Portal-Roles": role},
        )
        assert response.status_code == 200
        assert response.json() == {
            "authorized": True,
            "side_effects": False,
            "actor": "user:be02-test",
        }


def test_multiple_roles_are_deduplicated_and_accumulate_permissions(
    client: TestClient, trusted_headers: dict[str, str]
) -> None:
    response = client.get(
        "/api/v1/authz/me",
        headers={**trusted_headers, "X-Portal-Roles": "viewer,reviewer,viewer,unknown"},
    )
    assert response.status_code == 200
    assert response.json()["roles"] == ["reviewer", "viewer"]
    assert "review:write" in response.json()["permissions"]
    assert "review:read" in response.json()["permissions"]
    assert "source:write" in response.json()["permissions"]
    assert "snapshot:write" in response.json()["permissions"]
