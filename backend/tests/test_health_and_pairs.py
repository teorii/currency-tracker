from datetime import UTC, datetime
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.models import CurrencyPair, ExchangeRate

QUOTED_AT = datetime(2026, 3, 2, 12, 0, tzinfo=UTC)


def seed(db: Session, target: str, rate: float, when: datetime = QUOTED_AT) -> CurrencyPair:
    pair = CurrencyPair(base_currency="USD", target_currency=target)
    db.add(pair)
    db.commit()
    db.refresh(pair)
    db.add(ExchangeRate(currency_pair_id=pair.id, rate=rate, timestamp=when))
    db.commit()
    return pair


def test_health_reports_what_is_held(client: TestClient, db: Session) -> None:
    seed(db, "EUR", 0.92)
    seed(db, "GBP", 0.79)

    body = client.get("/health").json()

    assert body == {
        "status": "ok",
        "database": "up",
        "tracked_pairs": 2,
        "latest_quote_at": QUOTED_AT.isoformat().replace("+00:00", "Z"),
    }


def test_health_is_a_503_when_the_database_is_unreachable(client: TestClient) -> None:
    failure = OperationalError("SELECT 1", {}, Exception("connection refused"))

    with patch("sqlalchemy.orm.Session.execute", side_effect=failure):
        response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["database"] == "down"


def test_pairs_lists_history_depth(client: TestClient, db: Session) -> None:
    pair = seed(db, "EUR", 0.92, when=datetime(2026, 3, 1, 9, 0, tzinfo=UTC))
    db.add(ExchangeRate(currency_pair_id=pair.id, rate=0.93, timestamp=QUOTED_AT))
    db.commit()
    seed(db, "GBP", 0.79)

    body = client.get("/rates/pairs").json()

    assert body["count"] == 2
    eur = next(p for p in body["pairs"] if p["target_currency"] == "EUR")
    assert eur["observations"] == 2
    assert eur["latest_quote_at"].startswith("2026-03-02T12:00")


def test_a_pair_with_no_rates_still_appears(client: TestClient, db: Session) -> None:
    db.add(CurrencyPair(base_currency="USD", target_currency="CHF"))
    db.commit()

    body = client.get("/rates/pairs").json()

    assert body["pairs"][0]["observations"] == 0
    assert body["pairs"][0]["latest_quote_at"] is None
