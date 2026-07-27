from __future__ import annotations

import hmac
import re
from collections.abc import Callable
from enum import StrEnum
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict

from mkt53_backend.config import Settings

SUBJECT_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,127}$")


class Role(StrEnum):
    VIEWER = "viewer"
    ANALYST = "analyst"
    REVIEWER = "reviewer"
    ADMIN = "admin"


class Permission(StrEnum):
    HEALTH_READ = "health:read"
    SOURCE_READ = "source:read"
    SOURCE_WRITE = "source:write"
    SNAPSHOT_READ = "snapshot:read"
    SNAPSHOT_WRITE = "snapshot:write"
    REVIEW_READ = "review:read"
    REVIEW_WRITE = "review:write"
    ADMIN = "admin:*"


ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.VIEWER: frozenset({Permission.HEALTH_READ}),
    Role.ANALYST: frozenset(
        {Permission.HEALTH_READ, Permission.SOURCE_READ, Permission.SNAPSHOT_READ, Permission.REVIEW_READ}
    ),
    Role.REVIEWER: frozenset(
        {
            Permission.HEALTH_READ,
            Permission.SOURCE_READ,
            Permission.SOURCE_WRITE,
            Permission.SNAPSHOT_READ,
            Permission.SNAPSHOT_WRITE,
            Permission.REVIEW_READ,
            Permission.REVIEW_WRITE,
        }
    ),
    Role.ADMIN: frozenset(Permission),
}


class Principal(BaseModel):
    model_config = ConfigDict(frozen=True)

    subject: str
    roles: frozenset[Role]
    permissions: frozenset[Permission]


def _authentication_error() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication_required")


def _authorization_error() -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient_role")


def _parse_roles(raw_roles: str | None) -> frozenset[Role]:
    if not raw_roles or len(raw_roles) > 256:
        raise _authorization_error()

    roles: set[Role] = set()
    for item in raw_roles.split(","):
        candidate = item.strip().lower()
        if not candidate:
            continue
        try:
            roles.add(Role(candidate))
        except ValueError:
            continue
    if not roles:
        raise _authorization_error()
    return frozenset(roles)


def get_current_principal(
    request: Request,
    proxy_token: Annotated[str | None, Header(alias="X-Mkt53-Proxy-Token")] = None,
    portal_subject: Annotated[str | None, Header(alias="X-Portal-Subject")] = None,
    portal_roles: Annotated[str | None, Header(alias="X-Portal-Roles")] = None,
) -> Principal:
    settings = request.app.state.settings
    if not isinstance(settings, Settings):
        raise RuntimeError("application settings are unavailable")
    expected_token = settings.trusted_proxy_token.get_secret_value()
    if not proxy_token or not hmac.compare_digest(proxy_token, expected_token):
        raise _authentication_error()
    if not portal_subject or not SUBJECT_PATTERN.fullmatch(portal_subject):
        raise _authentication_error()

    roles = _parse_roles(portal_roles)
    permissions = frozenset(permission for role in roles for permission in ROLE_PERMISSIONS[role])
    return Principal(subject=portal_subject, roles=roles, permissions=permissions)


def require_permission(permission: Permission) -> Callable[..., Principal]:
    def dependency(
        principal: Annotated[Principal, Depends(get_current_principal)],
    ) -> Principal:
        if permission not in principal.permissions and Permission.ADMIN not in principal.permissions:
            raise _authorization_error()
        return principal

    return dependency
