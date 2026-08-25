import csv
import io
import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CurrencyPair, ExchangeRate
from ..schemas import (
    Conversion,
    Deleted,
    FetchResult,
    HistoryPoint,
    LatestRates,
    RateHistory,
    RateSnapshot,
    TrackedPair,
    TrackedPairs,
)
from ..services.conversion import derive_rate
from ..services.provider import ExchangeRateError
from ..services.rates import latest_rate_rows, refresh_rates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rates", tags=["rates"])


def code(description: str) -> Any:
    """A fresh Query per parameter; FastAPI writes the alias onto the instance."""
    return Query(..., min_length=3, max_length=3, pattern=r"^[A-Za-z]{3}$", description=description)


@router.post("/fetch-now", response_model=FetchResult)
async def fetch_exchange_rates_now(db: Session = Depends(get_db)):
    """Pull the current quotes now rather than waiting for the hourly job."""
    try:
        return await refresh_rates(db)
    except ExchangeRateError as exc:
        # The provider failing is not this service failing, so report it as a
        # bad gateway rather than an internal error.
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/latest", response_model=LatestRates)
async def get_latest_rates(db: Session = Depends(get_db)):
    """The most recent quote held for every tracked pair."""
    # Ranking inside the database keeps this to one round trip. Reading the
    # pairs and then querying each one's newest rate meant a query per pair.
    ranked = latest_rate_rows()
    rows = db.execute(
        select(
            CurrencyPair.base_currency,
            CurrencyPair.target_currency,
            ranked.c.rate,
            ranked.c.timestamp,
        )
        .join(ranked, ranked.c.currency_pair_id == CurrencyPair.id)
        .where(ranked.c.recency == 1)
        .order_by(CurrencyPair.base_currency, CurrencyPair.target_currency)
    ).all()

    snapshots = [
        RateSnapshot(base_currency=base, target_currency=target, rate=rate, timestamp=timestamp)
        for base, target, rate, timestamp in rows
    ]
    return LatestRates(rates=snapshots, count=len(snapshots))


@router.get("/pairs", response_model=TrackedPairs)
async def list_pairs(db: Session = Depends(get_db)):
    """Every pair held, with how much history each one has behind it."""
    rows = db.execute(
        select(
            CurrencyPair.base_currency,
            CurrencyPair.target_currency,
            CurrencyPair.created_at,
            func.count(ExchangeRate.id),
            func.max(ExchangeRate.timestamp),
        )
        .outerjoin(ExchangeRate, ExchangeRate.currency_pair_id == CurrencyPair.id)
        .group_by(CurrencyPair.id, CurrencyPair.base_currency, CurrencyPair.target_currency)
        .order_by(CurrencyPair.base_currency, CurrencyPair.target_currency)
    ).all()

    pairs = [
        TrackedPair(
            base_currency=base,
            target_currency=target,
            first_seen=first_seen,
            observations=observations,
            latest_quote_at=latest,
        )
        for base, target, first_seen, observations, latest in rows
    ]
    return TrackedPairs(pairs=pairs, count=len(pairs))


@router.get("/convert", response_model=Conversion)
async def convert(
    base: str = code("Currency to convert from, for example EUR"),
    target: str = code("Currency to convert into, for example JPY"),
    amount: float = Query(1.0, ge=0, description="How much of the base currency"),
    db: Session = Depends(get_db),
):
    """Price one currency against another, deriving the rate when it is not quoted."""
    derived = derive_rate(db, base.upper(), target.upper())

    if derived is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No rate held that prices {base.upper()} against {target.upper()}, "
                "directly or through another currency."
            ),
        )

    return Conversion(
        base_currency=base,
        target_currency=target,
        amount=amount,
        rate=derived.rate,
        converted=amount * derived.rate,
        quoted_at=derived.quoted_at,
        basis=derived.basis,
        via=derived.via,
    )


def _parse_boundary(value: str, field: str) -> datetime:
    """Read a range boundary given as either YYYY-MM-DD or a full ISO timestamp."""
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read {field} date {value!r}. Use YYYY-MM-DD or an ISO timestamp.",
        ) from None

    # A bare date carries no offset, so read it as UTC rather than as
    # whatever timezone the server happens to sit in.
    parsed = parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)

    if "T" not in value:
        # A bare date as the end of a range should include that whole day.
        return parsed.replace(hour=23, minute=59, second=59, microsecond=999999)

    return parsed


def _resolve_range(start: str, end: str) -> tuple[datetime, datetime]:
    start_at = _parse_boundary(start, "start")
    if "T" not in start:
        start_at = start_at.replace(hour=0, minute=0, second=0, microsecond=0)
    end_at = _parse_boundary(end, "end")

    if start_at > end_at:
        raise HTTPException(
            status_code=400, detail="The start date must not be after the end date."
        )

    return start_at, end_at


def _require_pair(db: Session, base: str, target: str) -> CurrencyPair:
    pair = (
        db.query(CurrencyPair)
        .filter(
            CurrencyPair.base_currency == base.upper(),
            CurrencyPair.target_currency == target.upper(),
        )
        .first()
    )

    if pair is None:
        raise HTTPException(
            status_code=404,
            detail=f"Currency pair {base.upper()}/{target.upper()} is not tracked.",
        )

    return pair


def _rates_between(
    db: Session, pair: CurrencyPair, start_at: datetime, end_at: datetime
) -> list[ExchangeRate]:
    return (
        db.query(ExchangeRate)
        .filter(
            ExchangeRate.currency_pair_id == pair.id,
            ExchangeRate.timestamp >= start_at,
            ExchangeRate.timestamp <= end_at,
        )
        .order_by(ExchangeRate.timestamp)
        .all()
    )


@router.get("/history", response_model=RateHistory)
async def get_rate_history(
    base: str = code("Base currency code, for example USD"),
    target: str = code("Target currency code, for example EUR"),
    start: str = Query(..., description="Start of the range, YYYY-MM-DD or ISO timestamp"),
    end: str = Query(..., description="End of the range, YYYY-MM-DD or ISO timestamp"),
    db: Session = Depends(get_db),
):
    """Every quote recorded for one pair between two points in time."""
    start_at, end_at = _resolve_range(start, end)
    pair = _require_pair(db, base, target)
    rates = _rates_between(db, pair, start_at, end_at)

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


@router.get(
    "/history.csv",
    response_class=Response,
    responses={200: {"content": {"text/csv": {}}, "description": "Rate history as CSV"}},
)
async def export_rate_history(
    base: str = code("Base currency code, for example USD"),
    target: str = code("Target currency code, for example EUR"),
    start: str = Query(..., description="Start of the range, YYYY-MM-DD or ISO timestamp"),
    end: str = Query(..., description="End of the range, YYYY-MM-DD or ISO timestamp"),
    db: Session = Depends(get_db),
):
    """The same history as a spreadsheet download."""
    start_at, end_at = _resolve_range(start, end)
    pair = _require_pair(db, base, target)
    rates = _rates_between(db, pair, start_at, end_at)

    # Built in memory rather than streamed: the request-scoped session is closed
    # once the handler returns, and a generator would still be reading from it.
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(("timestamp", "base_currency", "target_currency", "rate"))
    for rate in rates:
        writer.writerow(
            (rate.timestamp.isoformat(), pair.base_currency, pair.target_currency, rate.rate)
        )

    filename = f"{pair.base_currency}-{pair.target_currency}_{start_at:%Y%m%d}-{end_at:%Y%m%d}.csv"
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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
