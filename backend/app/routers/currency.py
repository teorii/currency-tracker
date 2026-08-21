import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CurrencyPair, ExchangeRate
from ..services.exchange_rate_service import fetch_and_store_exchange_rates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rates", tags=["rates"])

# Manually trigger an exchange rate fetch from the external API.
# Returns: dict: Result containing message, base_currency, timestamp, and counts
# Raises: HTTPException: If the fetch operation fails
@router.post("/fetch-now")
async def fetch_exchange_rates_now(db: Session = Depends(get_db)):
    try:
        result = await fetch_and_store_exchange_rates(db)
        return result
    except ValueError as e:
        logger.error(f"Validation error in fetch-now endpoint: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid request: {e!s}")
    except Exception as e:
        logger.error(f"Error in fetch-now endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing exchange rates: {e!s}")

# Get the latest exchange rate for each tracked currency pair.
# Returns: dict: Contains 'rates' list and 'count' of rates
# Raises: HTTPException: If database query fails
@router.get("/latest")
async def get_latest_rates(db: Session = Depends(get_db)):
    try:
        currency_pairs = db.query(CurrencyPair).all()
        
        if not currency_pairs:
            return {
                "message": "No currency pairs tracked yet. Call POST /rates/fetch-now first.",
                "rates": [],
                "count": 0
            }
        
        latest_rates = []
        
        for pair in currency_pairs:
            try:
                latest_rate = db.query(ExchangeRate).filter(
                    ExchangeRate.currency_pair_id == pair.id
                ).order_by(desc(ExchangeRate.timestamp)).first()
                
                if latest_rate:
                    latest_rates.append({
                        "base_currency": pair.base_currency,
                        "target_currency": pair.target_currency,
                        "rate": float(latest_rate.rate),
                        "timestamp": latest_rate.timestamp.isoformat()
                    })
            except Exception as e:
                logger.warning(f"Error fetching rate for {pair.base_currency}/{pair.target_currency}: {e}")
                continue
        
        return {"rates": latest_rates, "count": len(latest_rates)}
        
    except Exception as e:
        logger.error(f"Error fetching latest rates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving latest rates: {e!s}")

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


@router.get("/history")
async def get_rate_history(
    base: str = Query(..., description="Base currency code, for example USD"),
    target: str = Query(..., description="Target currency code, for example EUR"),
    start: str = Query(..., description="Start of the range, YYYY-MM-DD or ISO timestamp"),
    end: str = Query(..., description="End of the range, YYYY-MM-DD or ISO timestamp"),
    db: Session = Depends(get_db),
):
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

    history = [
        {
            "date": rate.timestamp.date().isoformat(),
            "timestamp": rate.timestamp.isoformat(),
            "rate": rate.rate,
        }
        for rate in rates
    ]

    return {
        "base_currency": base.upper(),
        "target_currency": target.upper(),
        "start_date": start,
        "end_date": end,
        "history": history,
        "count": len(history),
    }


# Delete a currency pair and all its associated exchange rate history.
# Args: base: Base currency code (e.g., "USD"), target: Target currency code (e.g., "EUR"), db: Database session
# Returns: dict: Success message
# Raises: HTTPException: If pair not found or deletion fails
@router.delete("/pairs/{base}/{target}")
async def delete_currency_pair(
    base: str,
    target: str,
    db: Session = Depends(get_db)
):
    try:
        currency_pair = db.query(CurrencyPair).filter(
            CurrencyPair.base_currency == base.upper(),
            CurrencyPair.target_currency == target.upper()
        ).first()
        
        if not currency_pair:
            raise HTTPException(
                status_code=404,
                detail=f"Currency pair {base}/{target} not found"
            )
        
        db.query(ExchangeRate).filter(
            ExchangeRate.currency_pair_id == currency_pair.id
        ).delete()
        
        db.delete(currency_pair)
        db.commit()
        
        return {
            "message": f"Successfully deleted currency pair {base.upper()}/{target.upper()} and all associated rates"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting currency pair: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting currency pair: {e!s}")
