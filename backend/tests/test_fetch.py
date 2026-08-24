from datetime import UTC, datetime

import httpx
import respx
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CurrencyPair, ExchangeRate

LIVE = dict(host="rates.test", path="/live")


@respx.mock
def test_fetch_stores_a_pair_per_quote(client: TestClient, db: Session) -> None:
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

    body = client.post("/rates/fetch-now").json()

    assert body["stored_count"] == 2
    assert {p.target_currency for p in db.query(CurrencyPair).all()} == {"EUR", "GBP"}
    assert db.query(ExchangeRate).count() == 2


@respx.mock
def test_provider_outage_is_a_502_not_a_500(client: TestClient) -> None:
    respx.get(**LIVE).mock(return_value=httpx.Response(503))

    response = client.post("/rates/fetch-now")

    assert response.status_code == 502
    assert "503" in response.json()["detail"]


@respx.mock
def test_provider_rejection_is_a_502(client: TestClient) -> None:
    respx.get(**LIVE).mock(
        return_value=httpx.Response(
            200, json={"success": False, "error": {"info": "invalid access key"}}
        )
    )

    response = client.post("/rates/fetch-now")

    assert response.status_code == 502
    assert "invalid access key" in response.json()["detail"]


@respx.mock
def test_unreachable_provider_is_a_502(client: TestClient) -> None:
    respx.get(**LIVE).mock(side_effect=httpx.ConnectError("no route"))

    assert client.post("/rates/fetch-now").status_code == 502


def test_history_rejects_something_that_is_not_a_currency_code(client: TestClient) -> None:
    response = client.get(
        "/rates/history",
        params={"base": "DOLLAR", "target": "EUR", "start": "2026-03-01", "end": "2026-03-31"},
    )

    assert response.status_code == 422


@respx.mock
def test_rates_are_stamped_with_the_providers_quote_time(client: TestClient, db: Session) -> None:
    """The old code stamped rows with our own clock, losing when the quote was actually valid."""
    respx.get(**LIVE).mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "source": "USD",
                "timestamp": 1772452800,
                "quotes": {"USDEUR": 0.92},
            },
        )
    )

    client.post("/rates/fetch-now")

    stored = db.query(ExchangeRate).one()
    assert stored.timestamp == datetime(2026, 3, 2, 12, 0, tzinfo=UTC)


@respx.mock
def test_a_provider_without_a_timestamp_still_records(client: TestClient, db: Session) -> None:
    respx.get(**LIVE).mock(
        return_value=httpx.Response(
            200, json={"success": True, "source": "USD", "quotes": {"USDEUR": 0.92}}
        )
    )

    assert client.post("/rates/fetch-now").status_code == 200
    assert db.query(ExchangeRate).one().timestamp.tzinfo is not None
