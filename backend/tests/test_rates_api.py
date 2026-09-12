from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CurrencyPair, ExchangeRate


@pytest.fixture
def usd_eur(db: Session) -> CurrencyPair:
    pair = CurrencyPair(base_currency="USD", target_currency="EUR")
    db.add(pair)
    db.commit()
    db.refresh(pair)
    return pair


def stamp(year: int, month: int, day: int, hour: int = 0) -> datetime:
    return datetime(year, month, day, hour, tzinfo=UTC)


def add_rate(db: Session, pair: CurrencyPair, rate: float, when: datetime) -> None:
    db.add(ExchangeRate(currency_pair_id=pair.id, rate=rate, timestamp=when))
    db.commit()


def test_root_identifies_the_service(client: TestClient) -> None:
    assert client.get("/").json() == {"message": "Currency Exchange Rate Tracker API"}


def test_latest_explains_itself_when_nothing_is_tracked(client: TestClient) -> None:
    body = client.get("/rates/latest").json()

    assert body["count"] == 0
    assert body["rates"] == []


def test_latest_returns_the_most_recent_rate_per_pair(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    now = stamp(2026, 3, 1, 12)
    add_rate(db, usd_eur, 0.90, now - timedelta(hours=2))
    add_rate(db, usd_eur, 0.92, now)

    body = client.get("/rates/latest").json()

    assert body["count"] == 1
    assert body["rates"][0]["rate"] == pytest.approx(0.92)
    assert body["rates"][0]["base_currency"] == "USD"


def test_history_returns_only_points_inside_the_range(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    add_rate(db, usd_eur, 0.88, stamp(2026, 2, 20, 9))
    add_rate(db, usd_eur, 0.90, stamp(2026, 3, 2, 9))
    add_rate(db, usd_eur, 0.91, stamp(2026, 3, 4, 9))

    body = client.get(
        "/rates/history",
        params={"base": "USD", "target": "EUR", "start": "2026-03-01", "end": "2026-03-31"},
    ).json()

    assert [point["rate"] for point in body["history"]] == [0.90, 0.91]
    assert body["count"] == 2


def test_history_accepts_lowercase_currency_codes(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    add_rate(db, usd_eur, 0.90, stamp(2026, 3, 2, 9))

    response = client.get(
        "/rates/history",
        params={"base": "usd", "target": "eur", "start": "2026-03-01", "end": "2026-03-31"},
    )

    assert response.status_code == 200
    assert response.json()["base_currency"] == "USD"


def test_deleting_a_pair_removes_its_history(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    add_rate(db, usd_eur, 0.90, stamp(2026, 3, 2, 9))

    assert client.delete("/rates/pairs/USD/EUR").status_code == 200

    assert db.query(CurrencyPair).count() == 0
    assert db.query(ExchangeRate).count() == 0


def test_deleting_an_unknown_pair_is_a_404(client: TestClient) -> None:
    assert client.delete("/rates/pairs/USD/JPY").status_code == 404


def test_history_for_an_untracked_pair_is_a_404(client: TestClient) -> None:
    response = client.get(
        "/rates/history",
        params={"base": "USD", "target": "EUR", "start": "2026-03-01", "end": "2026-03-31"},
    )

    assert response.status_code == 404
    assert "USD/EUR" in response.json()["detail"]


def test_history_rejects_an_unreadable_date(client: TestClient, usd_eur: CurrencyPair) -> None:
    response = client.get(
        "/rates/history",
        params={"base": "USD", "target": "EUR", "start": "not-a-date", "end": "2026-03-31"},
    )

    assert response.status_code == 400
    assert "start" in response.json()["detail"]


def test_history_rejects_a_reversed_range(client: TestClient, usd_eur: CurrencyPair) -> None:
    response = client.get(
        "/rates/history",
        params={"base": "USD", "target": "EUR", "start": "2026-03-31", "end": "2026-03-01"},
    )

    assert response.status_code == 400


def test_history_accepts_offset_aware_timestamps(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    """An offset-aware bound used to be compared against a naive column."""
    add_rate(db, usd_eur, 0.90, stamp(2026, 3, 2, 9))

    response = client.get(
        "/rates/history",
        params={
            "base": "USD",
            "target": "EUR",
            "start": "2026-03-01T00:00:00+00:00",
            "end": "2026-03-31T23:59:59Z",
        },
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_history_end_date_includes_the_whole_final_day(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    add_rate(db, usd_eur, 0.90, stamp(2026, 3, 31, 18))

    body = client.get(
        "/rates/history",
        params={"base": "USD", "target": "EUR", "start": "2026-03-01", "end": "2026-03-31"},
    ).json()

    assert body["count"] == 1


def test_latest_does_not_scale_queries_with_pair_count(
    client: TestClient, db: Session, statements
) -> None:
    for target in ("EUR", "GBP", "JPY", "CHF", "CAD"):
        pair = CurrencyPair(base_currency="USD", target_currency=target)
        db.add(pair)
        db.commit()
        db.refresh(pair)
        add_rate(db, pair, 1.0, stamp(2026, 3, 1, 9))
        add_rate(db, pair, 1.1, stamp(2026, 3, 2, 9))

    with statements() as recorded:
        body = client.get("/rates/latest").json()

    selects = [s for s in recorded if s.lstrip().upper().startswith("SELECT")]
    assert body["count"] == 5
    # One for the newest rate per pair, one for the trailing window behind the
    # sparklines. Neither grows with the number of pairs.
    assert len(selects) == 2, f"expected two selects, issued {len(selects)}"


def test_latest_reports_movement_over_the_trailing_day(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    add_rate(db, usd_eur, 0.90, stamp(2026, 3, 1, 12))
    add_rate(db, usd_eur, 0.91, stamp(2026, 3, 1, 18))
    add_rate(db, usd_eur, 0.99, stamp(2026, 3, 2, 12))

    snapshot = client.get("/rates/latest").json()["rates"][0]

    assert snapshot["sparkline"] == [0.90, 0.91, 0.99]
    assert snapshot["change_24h"] == pytest.approx((0.99 - 0.90) / 0.90)


def test_latest_ignores_quotes_older_than_the_window(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    add_rate(db, usd_eur, 0.50, stamp(2026, 2, 20, 12))
    add_rate(db, usd_eur, 0.90, stamp(2026, 3, 1, 13))
    add_rate(db, usd_eur, 0.99, stamp(2026, 3, 2, 12))

    snapshot = client.get("/rates/latest").json()["rates"][0]

    assert snapshot["sparkline"] == [0.90, 0.99]
    assert snapshot["change_24h"] == pytest.approx((0.99 - 0.90) / 0.90)


def test_latest_has_no_change_until_a_second_quote_exists(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    add_rate(db, usd_eur, 0.90, stamp(2026, 3, 2, 12))

    snapshot = client.get("/rates/latest").json()["rates"][0]

    assert snapshot["change_24h"] is None
    assert snapshot["sparkline"] == [0.90]


def test_the_window_follows_the_newest_quote_not_the_clock(
    client: TestClient, db: Session, usd_eur: CurrencyPair
) -> None:
    """A refresh that stopped weeks ago should still show its last day of movement."""
    add_rate(db, usd_eur, 0.80, stamp(2025, 1, 1, 9))
    add_rate(db, usd_eur, 0.88, stamp(2025, 1, 2, 8))

    snapshot = client.get("/rates/latest").json()["rates"][0]

    assert snapshot["change_24h"] == pytest.approx(0.1)
