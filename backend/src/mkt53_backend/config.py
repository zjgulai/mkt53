from __future__ import annotations

import os
from enum import StrEnum
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

PRODUCTION_ORIGIN = "https://mkt.lute-tlz-dddd.top"
DEFAULT_DATABASE_PASSWORD = "fixture-only-database-password-be02"
DEFAULT_TRUSTED_PROXY_TOKEN = "fixture-only-proxy-token-be02-not-for-production"


class AppEnvironment(StrEnum):
    TEST = "test"
    DEVELOPMENT = "development"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Environment-aware settings with explicit production fail-closed checks."""

    model_config = SettingsConfigDict(env_prefix="MKT53_", case_sensitive=False, extra="ignore")

    app_env: AppEnvironment = AppEnvironment.DEVELOPMENT
    app_version: str = "0.5.0-be07"
    debug: bool = False
    dev_identity_enabled: bool = False
    allowed_origins: tuple[str, ...] = ()

    database_host: str = "postgres"
    database_port: int = Field(default=5432, ge=1, le=65535)
    database_name: str = "mkt53"
    database_user: str = "mkt53"
    database_password: SecretStr = SecretStr(DEFAULT_DATABASE_PASSWORD)
    database_connect_timeout_seconds: int = Field(default=2, ge=1, le=10)

    trusted_proxy_token: SecretStr = SecretStr(DEFAULT_TRUSTED_PROXY_TOKEN)

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def normalize_allowed_origins(cls, value: Any) -> Any:
        if value is None or value == "":
            return ()
        if isinstance(value, str) and not value.lstrip().startswith("["):
            return tuple(item.strip() for item in value.split(",") if item.strip())
        return value

    @field_validator("database_host", "database_name", "database_user", "app_version")
    @classmethod
    def reject_blank_strings(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value

    @model_validator(mode="after")
    def enforce_environment_boundary(self) -> Settings:
        if self.app_env is not AppEnvironment.PRODUCTION:
            return self

        errors: list[str] = []
        database_password = self.database_password.get_secret_value()
        proxy_token = self.trusted_proxy_token.get_secret_value()

        if self.debug:
            errors.append("debug must be false in production")
        if self.dev_identity_enabled:
            errors.append("dev identity must be disabled in production")
        if database_password == DEFAULT_DATABASE_PASSWORD or len(database_password) < 16:
            errors.append("production database password is missing or uses the fixture default")
        if proxy_token == DEFAULT_TRUSTED_PROXY_TOKEN or len(proxy_token) < 32:
            errors.append("production trusted proxy token is missing or uses the fixture default")

        for origin in self.allowed_origins:
            normalized = origin.rstrip("/")
            if origin == "*" or normalized != PRODUCTION_ORIGIN:
                errors.append("production CORS origins must be empty or the exact mkt HTTPS origin")
                break

        if errors:
            raise ValueError("; ".join(errors))
        return self

    @property
    def database_url(self) -> URL:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.database_user,
            password=self.database_password.get_secret_value(),
            host=self.database_host,
            port=self.database_port,
            database=self.database_name,
        )

    @property
    def openapi_enabled(self) -> bool:
        return self.app_env is not AppEnvironment.PRODUCTION


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    secrets_dir = os.getenv("MKT53_SECRETS_DIR")
    return Settings(_secrets_dir=Path(secrets_dir) if secrets_dir else None)


def clear_settings_cache() -> None:
    get_settings.cache_clear()
