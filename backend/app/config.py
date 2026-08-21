from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import ValidationError, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime configuration, read from the process environment or backend/.env."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    exchange_rate_api_key: str

    # The access key travels as a query parameter, so plain HTTP would hand it to
    # anyone on the network path. Only override this to point at a local mock.
    exchange_rate_api_base: str = "https://api.exchangerate.host"
    exchange_rate_timeout_seconds: float = 10.0

    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    fetch_schedule_minute: int = 0
    # Tests and one-off management commands boot the app without wanting a
    # background job attached to it.
    scheduler_enabled: bool = True

    # 127.0.0.1 rather than 0.0.0.0 so a development server is not exposed to
    # the local network by accident. Deployments set HOST explicitly.
    host: str = "127.0.0.1"
    port: int = 8000
    log_level: str = "INFO"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_comma_separated(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as exc:
        missing = [
            str(error["loc"][0]).upper() for error in exc.errors() if error["type"] == "missing"
        ]
        if not missing:
            raise
        raise RuntimeError(
            f"Missing required configuration: {', '.join(missing)}. "
            "Copy backend/.env.example to backend/.env and fill in the values."
        ) from exc
