import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CurrencyPair, ExchangeRate
from ..schemas import (
    Deleted,
    FetchResult,
    HistoryPoint,
    LatestRates,
    RateHistory,
    RateSnapshot,
)
from ..services.exchange_rate_service import ExchangeRateError, fetch_and_store_exchange_rates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rates", tags=["rates"])


def code(description: str) -> Any:
    """A fresh Query per parameter; FastAPI writes the alias onto the instance."""
    return Query(..., min_length=3, max_length=3, pattern=r"^[A-Za-z]{3}$", description=description)


@router.post("/fetch-now", response_model=FetchResult)
async def fetch_exchange_rates_now(db: Session = Depends(get_db)):
    """Pull the current quotes now rather than waiting for the hourly job."""
    try:
        return await fetch_and_store_exchange_rates(db)
    except ExchangeRateError as exc:
        # The provider failing is not this service failing, so report it as a
        # bad gateway rather than an internal error.
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/latest", response_model=LatestRates)
async def get_latest_rates(db: Session = Depends(get_db)):
    """The most recent quote held for every tracked pair."""
    snapshots = []

    for pair in db.query(CurrencyPair).all():
        latest = (
            db.query(ExchangeRate)
            .filter(ExchangeRate.currency_pair_id == pair.id)
            .order_by(desc(ExchangeRate.timestamp))
            .first()
        )
        if latest is not None:
            snapshots.append(
                RateSnapshot(
                    base_currency=pair.base_currency,
                    target_currency=pair.target_currency,
                    rate=latest.rate,
                    timestamp=latest.timestamp,
                )
            )

    return LatestRates(rates=snapshots, count=len(snapshots))


def _parse_boundary(value: str, field: str) -> datetime:
    """Read a range boundary given as either YYYY-MM-DD or a full ISO timestamp."""
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read {field} date {value!r}. Use YYYY-MM-DD or an ISO timestamp.",
        ) from None

    if parsed.tzinfo is not None:
        # Timestamps are stored naive in UTC, and comparing those against an
        # offset-aware value is an error rather than a conversion.
        parsed = parsed.astimezone(UTC).replace(tzinfo=None)

    if "T" not in value:
        # A bare date as the end of a range should include that whole day.
        return parsed.replace(hour=23, minute=59, second=59, microsecond=999999)

    return parsed


@router.get("/history", response_model=RateHistory)
async def get_rate_history(
    base: str = code("Base currency code, for example USD"),
    target: str = code("Target currency code, for example EUR"),
    start: str = Query(..., description="Start of the range, YYYY-MM-DD or ISO timestamp"),
    end: str = Query(..., description="End of the range, YYYY-MM-DD or ISO timestamp"),
    db: Session = Depends(get_db),
):
    """Every quote recorded for one pair between two points in time."""
    start_at = _parse_boundary(start, "start")
    if "T" not in start:
        start_at = start_at.replace(hour=0, minute=0, second=0, microsecond=0)
    end_at = _parse_boundary(end, "end")

    if start_at > end_at:
        raise HTTPException(
            status_code=400, detail="The start date must not be after the end date."
        )

    currency_pair = (
        db.query(CurrencyPair)
        .filter(
            CurrencyPair.base_currency == base.upper(),
            CurrencyPair.target_currency == target.upper(),
        )
        .first()
    )

    if currency_pair is None:
        raise HTTPException(
            status_code=404,
            detail=f"Currency pair {base.upper()}/{target.upper()} is not tracked.",
        )

    rates = (
        db.query(ExchangeRate)
        .filter(
            ExchangeRate.currency_pair_id == currency_pair.id,
            ExchangeRate.timestamp >= start_at,
            ExchangeRate.timestamp <= end_at,
        )
        .order_by(ExchangeRate.timestamp)
        .all()
    )

    return RateHistory(
        base_currency=base,
        target_currency=target,
        start_date=start_at,
        end_date=end_at,
        history=[
            HistoryPoint(date=rate.timestamp.date(), timestamp=rate.timestamp, rate=rate.rate)
            for rate in rates
        ],
        count=len(rates),
    )


@router.delete("/pairs/{base}/{target}", response_model=Deleted)
async def delete_currency_pair(base: str, target: str, db: Session = Depends(get_db)):
    """Remove a pair and everything recorded against it."""
    currency_pair = (
        db.query(CurrencyPair)
        .filter(
            CurrencyPair.base_currency == base.upper(),
            CurrencyPair.target_currency == target.upper(),
        )
        .first()
    )

    if currency_pair is None:
        raise HTTPException(
            status_code=404,
            detail=f"Currency pair {base.upper()}/{target.upper()} is not tracked.",
        )

    db.query(ExchangeRate).filter(ExchangeRate.currency_pair_id == currency_pair.id).delete(
        synchronize_session=False
    )
    db.delete(currency_pair)
    db.commit()

    logger.info("Deleted %s/%s", base.upper(), target.upper())
    return Deleted(message=f"Deleted {base.upper()}/{target.upper()} and its recorded rates.")
