from collections.abc import Iterator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from .config import get_settings


def _engine_options(url: str) -> dict[str, Any]:
    if url.startswith("sqlite"):
        # SQLite guards against cross-thread use, which FastAPI's threadpool
        # trips immediately. StaticPool keeps an in-memory database alive for
        # more than the one connection that created it.
        return {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
    # One round trip per checkout, in exchange for never handing out a
    # connection the server has already dropped.
    return {"pool_pre_ping": True}


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
