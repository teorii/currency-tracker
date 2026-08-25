import csv
import io
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import CurrencyPair, ExchangeRate


def seed(db: Session) -> None:
    pair = CurrencyPair(base_currency="USD", target_currency="EUR")
    db.add(pair)
    db.commit()
    db.refresh(pair)
    for day, rate in ((1, 0.90), (2, 0.92), (3, 0.91)):
        db.add(
            ExchangeRate(
                currency_pair_id=pair.id,
                rate=rate,
                timestamp=datetime(2026, 3, day, 12, 0, tzinfo=UTC),
            )
        )
    db.commit()


def test_export_returns_parseable_csv(client: TestClient, db: Session) -> None:
    seed(db)

    response = client.get(
        "/rates/history.csv",
        params={"base": "USD", "target": "EUR", "start": "2026-03-01", "end": "2026-03-31"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")

    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert [row["rate"] for row in rows] == ["0.9", "0.92", "0.91"]
    assert rows[0]["base_currency"] == "USD"
    assert rows[0]["timestamp"].startswith("2026-03-01T12:00")


def test_export_offers_a_filename_naming_the_pair_and_range(
    client: TestClient, db: Session
) -> None:
    seed(db)

    response = client.get(
        "/rates/history.csv",
        params={"base": "USD", "target": "EUR", "start": "2026-03-01", "end": "2026-03-31"},
    )

    disposition = response.headers["content-disposition"]
    assert "attachment" in disposition
    assert "USD-EUR_20260301-20260331.csv" in disposition


def test_export_honours_the_requested_range(client: TestClient, db: Session) -> None:
    seed(db)

    response = client.get(
        "/rates/history.csv",
        params={"base": "USD", "target": "EUR", "start": "2026-03-02", "end": "2026-03-02"},
    )

    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert [row["rate"] for row in rows] == ["0.92"]


def test_export_of_an_untracked_pair_is_a_404(client: TestClient) -> None:
    response = client.get(
        "/rates/history.csv",
        params={"base": "USD", "target": "JPY", "start": "2026-03-01", "end": "2026-03-31"},
    )

    assert response.status_code == 404


def test_export_with_no_rows_still_has_a_header(client: TestClient, db: Session) -> None:
    db.add(CurrencyPair(base_currency="USD", target_currency="CHF"))
    db.commit()

    response = client.get(
        "/rates/history.csv",
        params={"base": "USD", "target": "CHF", "start": "2026-03-01", "end": "2026-03-31"},
    )

    assert response.text.strip() == "timestamp,base_currency,target_currency,rate"
