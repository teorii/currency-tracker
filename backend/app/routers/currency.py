from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import CurrencyPair, ExchangeRate
from ..services.exchange_rate_service import fetch_and_store_exchange_rates
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rates", tags=["rates"])

@router.post("/fetch-now")
async def fetch_exchange_rates_now(db: Session = Depends(get_db)):
    """
    Manually trigger an exchange rate fetch from the external API.
    
    Returns:
        dict: Result containing message, base_currency, timestamp, and counts
        
    Raises:
        HTTPException: If the fetch operation fails
    """
    try:
        result = await fetch_and_store_exchange_rates(db)
        return result
    except ValueError as e:
        logger.error(f"Validation error in fetch-now endpoint: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
    except Exception as e:
        logger.error(f"Error in fetch-now endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing exchange rates: {str(e)}")

@router.get("/latest")
async def get_latest_rates(db: Session = Depends(get_db)):
    """
    Get the latest exchange rate for each tracked currency pair.
    
    Returns:
        dict: Contains 'rates' list and 'count' of rates
        
    Raises:
        HTTPException: If database query fails
    """
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
        raise HTTPException(status_code=500, detail=f"Error retrieving latest rates: {str(e)}")

@router.get("/history")
async def get_rate_history(
    base: str = Query(..., description="Base currency code (e.g., USD)"),
    target: str = Query(..., description="Target currency code (e.g., EUR)"),
    start: str = Query(..., description="Start date/time (YYYY-MM-DD or ISO format)"),
    end: str = Query(..., description="End date/time (YYYY-MM-DD or ISO format)"),
    db: Session = Depends(get_db)
):
    try:
        # Try parsing as ISO datetime first, fall back to date-only format
        try:
            # Handle ISO format with or without timezone
            if 'T' in start:
                start_date = datetime.fromisoformat(start.replace('Z', ''))
            else:
                start_date = datetime.strptime(start, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid start date format: {start}")
        
        try:
            # Handle ISO format with or without timezone
            if 'T' in end:
                end_date = datetime.fromisoformat(end.replace('Z', ''))
            else:
                end_date = datetime.strptime(end, "%Y-%m-%d")
                # If only date provided, set to end of day
                end_date = end_date + timedelta(days=1) - timedelta(seconds=1)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid end date format: {end}")
        
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        currency_pair = db.query(CurrencyPair).filter(
            CurrencyPair.base_currency == base.upper(),
            CurrencyPair.target_currency == target.upper()
        ).first()
        
        if not currency_pair:
            raise HTTPException(
                status_code=404, 
                detail=f"Currency pair {base}/{target} not found. Call POST /rates/fetch-now first."
            )
        
        rates = db.query(ExchangeRate).filter(
            ExchangeRate.currency_pair_id == currency_pair.id,
            ExchangeRate.timestamp >= start_date,
            ExchangeRate.timestamp <= end_date
        ).order_by(ExchangeRate.timestamp).all()
        
        history = [
            {
                "date": rate.timestamp.date().isoformat(),
                "timestamp": rate.timestamp.isoformat(),
                "rate": rate.rate
            }
            for rate in rates
        ]
        
        return {
            "base_currency": base.upper(),
            "target_currency": target.upper(),
            "start_date": start,
            "end_date": end,
            "history": history,
            "count": len(history)
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format. Use YYYY-MM-DD: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching rate history: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving rate history: {str(e)}")

@router.delete("/pairs/{base}/{target}")
async def delete_currency_pair(
    base: str,
    target: str,
    db: Session = Depends(get_db)
):
    """
    Delete a currency pair and all its associated exchange rate history.
    
    Args:
        base: Base currency code (e.g., "USD")
        target: Target currency code (e.g., "EUR")
        db: Database session
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: If pair not found or deletion fails
    """
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
        raise HTTPException(status_code=500, detail=f"Error deleting currency pair: {str(e)}")
