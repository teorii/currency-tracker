import logging
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Subquery, func, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session

from ..models import CurrencyPair, ExchangeRate
from .provider import LiveQuotes, fetch_live_quotes

logger = logging.getLogger(__name__)


def latest_rate_rows() -> Subquery:
    """Each pair's newest rate, ranked in the database rather than in a loop.

    Callers filter on recency == 1. Shared so the read endpoints and the
    conversion logic cannot drift on what "latest" means.
    """
    return select(
        ExchangeRate.currency_pair_id,
        ExchangeRate.rate,
        ExchangeRate.timestamp,
        func.row_number()
        .over(
            partition_by=ExchangeRate.currency_pair_id,
            order_by=ExchangeRate.timestamp.desc(),
        )
        .label("recency"),
    ).subquery()


@dataclass(frozen=True)
class RefreshResult:
    base_currency: str
    quoted_at: datetime
    received: int
    stored: int


def _insert_ignoring_duplicates(db: Session, model: type, rows: list[dict]) -> int:
    """Insert rows, skipping any that collide with a unique constraint.

    Letting the database decide keeps this correct when two refreshes overlap.
    Reading first and then inserting what appeared to be missing cannot be.
    """
    if not rows:
        return 0

    result = db.execute(insert(model).values(rows).on_conflict_do_nothing())
    return result.rowcount


def _pair_ids_by_target(db: Session, base: str) -> dict[str, int]:
    return dict(
        db.execute(
            select(CurrencyPair.target_currency, CurrencyPair.id).where(
                CurrencyPair.base_currency == base
            )
        ).all()
    )


def store_quotes(db: Session, quotes: LiveQuotes) -> RefreshResult:
    """Record one provider reading.

    Four statements regardless of how many currencies came back. This used to
    run two queries per currency, and the provider quotes well over a hundred.
    """
    pair_ids = _pair_ids_by_target(db, quotes.base)

    unknown = [target for target in quotes.rates if target not in pair_ids]
    if unknown:
        _insert_ignoring_duplicates(
            db,
            CurrencyPair,
            [{"base_currency": quotes.base, "target_currency": target} for target in unknown],
        )
        pair_ids = _pair_ids_by_target(db, quotes.base)

    stored = _insert_ignoring_duplicates(
        db,
        ExchangeRate,
        [
            {"currency_pair_id": pair_ids[target], "rate": rate, "timestamp": quotes.quoted_at}
            for target, rate in quotes.rates.items()
            if target in pair_ids
        ],
    )
    db.commit()

    logger.info(
        "Stored %d of %d quotes for %s at %s",
        stored,
        len(quotes.rates),
        quotes.base,
        quotes.quoted_at.isoformat(),
    )
    return RefreshResult(
        base_currency=quotes.base,
        quoted_at=quotes.quoted_at,
        received=len(quotes.rates),
        stored=stored,
    )


async def refresh_rates(db: Session) -> RefreshResult:
    quotes = await fetch_live_quotes()
    try:
        return store_quotes(db, quotes)
    except Exception:
        db.rollback()
        raise
