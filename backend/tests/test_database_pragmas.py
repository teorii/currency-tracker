from datetime import UTC, datetime

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import CurrencyPair, ExchangeRate

QUOTED_AT = datetime(2026, 3, 2, 12, 0, tzinfo=UTC)


def test_foreign_keys_are_enforced(db: Session) -> None:
    assert db.execute(text("PRAGMA foreign_keys")).scalar() == 1


def test_a_rate_cannot_name_a_pair_that_does_not_exist(db: Session) -> None:
    db.add(ExchangeRate(currency_pair_id=9999, rate=1.0, timestamp=QUOTED_AT))

    with pytest.raises(IntegrityError):
        db.commit()


def test_deleting_a_pair_takes_its_rates_with_it(db: Session) -> None:
    """The cascade is declared on the column but SQLite ignores it unless asked."""
    pair = CurrencyPair(base_currency="USD", target_currency="EUR")
    db.add(pair)
    db.commit()
    db.refresh(pair)
    db.add(ExchangeRate(currency_pair_id=pair.id, rate=0.92, timestamp=QUOTED_AT))
    db.commit()

    db.execute(text("DELETE FROM currency_pairs WHERE id = :id"), {"id": pair.id})
    db.commit()

    assert db.query(ExchangeRate).count() == 0
