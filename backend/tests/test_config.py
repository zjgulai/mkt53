from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import SecretStr, ValidationError

from mkt53_backend.config import (
    DEFAULT_DATABASE_PASSWORD,
    DEFAULT_TRUSTED_PROXY_TOKEN,
    PRODUCTION_ORIGIN,
    AppEnvironment,
    Settings,
)

PRODUCTION_DATABASE_PASSWORD = "production-like-database-password"
PRODUCTION_PROXY_TOKEN = "production-like-proxy-token-with-more-than-thirty-two-characters"


def production_settings(**overrides) -> Settings:
    values = {
        "app_env": AppEnvironment.PRODUCTION,
        "database_password": SecretStr(PRODUCTION_DATABASE_PASSWORD),
        "trusted_proxy_token": SecretStr(PRODUCTION_PROXY_TOKEN),
    }
    values.update(overrides)
    return Settings(**values)


@pytest.mark.parametrize(
    ("override", "expected"),
    [
        ({"debug": True}, "debug must be false"),
        ({"dev_identity_enabled": True}, "dev identity must be disabled"),
        ({"database_password": SecretStr(DEFAULT_DATABASE_PASSWORD)}, "database password"),
        ({"trusted_proxy_token": SecretStr(DEFAULT_TRUSTED_PROXY_TOKEN)}, "trusted proxy token"),
        ({"allowed_origins": ("*",)}, "CORS origins"),
        ({"allowed_origins": ("http://mkt.lute-tlz-dddd.top",)}, "CORS origins"),
    ],
)
def test_production_configuration_fails_closed(override: dict, expected: str) -> None:
    with pytest.raises(ValidationError, match=expected):
        production_settings(**override)


def test_production_accepts_empty_or_exact_https_origin() -> None:
    assert production_settings().allowed_origins == ()
    assert production_settings(allowed_origins=(PRODUCTION_ORIGIN,)).allowed_origins == (PRODUCTION_ORIGIN,)


def test_production_disables_openapi() -> None:
    assert production_settings().openapi_enabled is False


def test_nonproduction_allows_fixture_defaults_but_keeps_dev_identity_disabled() -> None:
    settings = Settings(app_env=AppEnvironment.TEST)
    assert settings.database_password.get_secret_value() == DEFAULT_DATABASE_PASSWORD
    assert settings.trusted_proxy_token.get_secret_value() == DEFAULT_TRUSTED_PROXY_TOKEN
    assert settings.dev_identity_enabled is False


def test_secret_files_are_loaded_from_explicit_directory(tmp_path: Path) -> None:
    (tmp_path / "MKT53_DATABASE_PASSWORD").write_text(PRODUCTION_DATABASE_PASSWORD, encoding="utf-8")
    (tmp_path / "MKT53_TRUSTED_PROXY_TOKEN").write_text(PRODUCTION_PROXY_TOKEN, encoding="utf-8")

    settings = Settings(app_env=AppEnvironment.PRODUCTION, _secrets_dir=tmp_path)
    assert settings.database_password.get_secret_value() == PRODUCTION_DATABASE_PASSWORD
    assert settings.trusted_proxy_token.get_secret_value() == PRODUCTION_PROXY_TOKEN


def test_database_url_hides_password_when_stringified() -> None:
    settings = production_settings()
    assert "***" in str(settings.database_url)
    assert PRODUCTION_DATABASE_PASSWORD not in str(settings.database_url)
