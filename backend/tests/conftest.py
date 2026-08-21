import os

# The application builds its engine at import time, so the database has to be
# pointed at SQLite before anything under app/ is imported.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["EXCHANGE_RATE_API_KEY"] = "test-key"
# Pinned so the suite never reads a developer's real .env or reaches the network.
os.environ["EXCHANGE_RATE_API_BASE"] = "https://rates.test"
os.environ["SCHEDULER_ENABLED"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.main import app


@pytest.fixture
def client() -> TestClient:
    """A running application backed by a fresh in-memory database.

    Leaving the context manager disposes the engine, which drops the in-memory
    database with it, so each test starts from an empty schema.
    """
    with TestClient(app) as test_client:
        Base.metadata.create_all(bind=engine)
        yield test_client


@pytest.fixture
def db(client: TestClient) -> Session:
    """A session on the same database the client is serving from.

    Depends on client so that the schema exists before a test seeds it.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
