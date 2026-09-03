from collections.abc import Iterator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from .config import get_settings


def _engine_options(url: str) -> dict[str, Any]:
    options: dict[str, Any] = {
        # Requests are served from a threadpool, and SQLite refuses by default
        # to let a connection be used from any thread but the one that made it.
        "connect_args": {"check_same_thread": False},
    }

    if url in {"sqlite://", "sqlite:///:memory:"}:
        # An in-memory database exists only inside its own connection, so every
        # caller has to be handed the same one. This is what the tests run on.
        options["poolclass"] = StaticPool

    return options


_database_url = get_settings().database_url

engine = create_engine(_database_url, **_engine_options(_database_url))
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
