from datetime import UTC, datetime

import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import CurrencyPair, ExchangeRate

LIVE = dict(host="rates.test", path="/live")


def test_the_same_pair_cannot_be_stored_twice(db: Session) -> None:
    db.add(CurrencyPair(base_currency="USD", target_currency="EUR"))
    db.commit()

    db.add(CurrencyPair(base_currency="USD", target_currency="EUR"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_a_pair_cannot_hold_two_rates_for_one_quote_time(db: Session) -> None:
    pair = CurrencyPair(base_currency="USD", target_currency="EUR")
    db.add(pair)
    db.commit()
    db.refresh(pair)

    quoted_at = datetime(2026, 3, 2, 12, 0, tzinfo=UTC)
    db.add(ExchangeRate(currency_pair_id=pair.id, rate=0.92, timestamp=quoted_at))
    db.commit()

    db.add(ExchangeRate(currency_pair_id=pair.id, rate=0.93, timestamp=quoted_at))
    with pytest.raises(IntegrityError):
        db.commit()


@respx.mock
def test_fetching_the_same_quotes_twice_does_not_duplicate_them(
    client: TestClient, db: Session
) -> None:
    respx.get(**LIVE).mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "source": "USD",
                "timestamp": 1772452800,
                "quotes": {"USDEUR": 0.92, "USDGBP": 0.79},
            },
        )
    )

    assert client.post("/rates/fetch-now").json()["stored"] == 2
    assert client.post("/rates/fetch-now").json()["stored"] == 0

    assert db.query(CurrencyPair).count() == 2
    assert db.query(ExchangeRate).count() == 2
