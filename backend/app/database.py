from collections.abc import Iterator
from typing import Any

from sqlalchemy import create_engine, event
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


@event.listens_for(engine, "connect")
def _apply_sqlite_pragmas(connection, _record) -> None:
    """SQLite defaults that the schema and the scheduler both depend on.

    Foreign keys are off unless asked for, so without this the cascade on
    exchange_rates does nothing and a rate can name a pair that was deleted.
    WAL lets the hourly refresh write while requests are still reading, and
    the busy timeout makes a reader wait its turn rather than failing.
    """
    cursor = connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
    finally:
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
