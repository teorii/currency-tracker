from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CurrencyPair, ExchangeRate

QUOTED_AT = datetime(2026, 3, 2, 12, 0, tzinfo=UTC)


def quote(db: Session, base: str, target: str, rate: float, when: datetime = QUOTED_AT) -> None:
    pair = (
        db.query(CurrencyPair)
        .filter(CurrencyPair.base_currency == base, CurrencyPair.target_currency == target)
        .first()
    )
    if pair is None:
        pair = CurrencyPair(base_currency=base, target_currency=target)
        db.add(pair)
        db.commit()
        db.refresh(pair)
    db.add(ExchangeRate(currency_pair_id=pair.id, rate=rate, timestamp=when))
    db.commit()


def test_converting_a_currency_to_itself_is_the_identity(client: TestClient) -> None:
    body = client.get(
        "/rates/convert", params={"base": "USD", "target": "USD", "amount": 42}
    ).json()

    assert body["rate"] == 1.0
    assert body["converted"] == 42
    assert body["basis"] == "identity"


def test_a_quoted_pair_is_used_directly(client: TestClient, db: Session) -> None:
    quote(db, "USD", "EUR", 0.92)

    body = client.get(
        "/rates/convert", params={"base": "USD", "target": "EUR", "amount": 50}
    ).json()

    assert body["rate"] == pytest.approx(0.92)
    assert body["converted"] == pytest.approx(46.0)
    assert body["basis"] == "direct"
    assert body["via"] is None


def test_the_reverse_of_a_quoted_pair_is_inverted(client: TestClient, db: Session) -> None:
    quote(db, "USD", "EUR", 0.92)

    body = client.get("/rates/convert", params={"base": "EUR", "target": "USD"}).json()

    assert body["rate"] == pytest.approx(1 / 0.92)
    assert body["basis"] == "inverse"


def test_an_unquoted_pair_is_crossed_through_a_shared_currency(
    client: TestClient, db: Session
) -> None:
    """EUR/JPY is never quoted, but USD/EUR and USD/JPY together give it."""
    quote(db, "USD", "EUR", 0.92)
    quote(db, "USD", "JPY", 149.5)

    body = client.get("/rates/convert", params={"base": "EUR", "target": "JPY"}).json()

    assert body["rate"] == pytest.approx(149.5 / 0.92)
    assert body["basis"] == "cross"
    assert body["via"] == "USD"


def test_a_cross_rate_is_dated_by_its_stalest_leg(client: TestClient, db: Session) -> None:
    stale = datetime(2026, 3, 1, 9, 0, tzinfo=UTC)
    quote(db, "USD", "EUR", 0.92, when=stale)
    quote(db, "USD", "JPY", 149.5, when=QUOTED_AT)

    body = client.get("/rates/convert", params={"base": "EUR", "target": "JPY"}).json()

    assert body["quoted_at"].startswith("2026-03-01T09:00")


def test_the_newest_rate_wins_when_a_pair_has_history(client: TestClient, db: Session) -> None:
    quote(db, "USD", "EUR", 0.80, when=datetime(2026, 3, 1, 9, 0, tzinfo=UTC))
    quote(db, "USD", "EUR", 0.92, when=QUOTED_AT)

    assert client.get("/rates/convert", params={"base": "USD", "target": "EUR"}).json()[
        "rate"
    ] == pytest.approx(0.92)


def test_a_pair_with_no_route_is_a_404(client: TestClient, db: Session) -> None:
    quote(db, "USD", "EUR", 0.92)

    response = client.get("/rates/convert", params={"base": "EUR", "target": "JPY"})

    assert response.status_code == 404


def test_a_round_trip_through_a_cross_rate_returns_the_original_amount(
    client: TestClient, db: Session
) -> None:
    quote(db, "USD", "EUR", 0.92)
    quote(db, "USD", "JPY", 149.5)

    forward = client.get(
        "/rates/convert", params={"base": "EUR", "target": "JPY", "amount": 100}
    ).json()
    back = client.get(
        "/rates/convert", params={"base": "JPY", "target": "EUR", "amount": forward["converted"]}
    ).json()

    assert back["converted"] == pytest.approx(100.0)
