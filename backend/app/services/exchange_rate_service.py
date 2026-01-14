from sqlalchemy.orm import Session
from ..models import CurrencyPair, ExchangeRate
from datetime import datetime, timedelta
import httpx
import logging
import os

logger = logging.getLogger(__name__)

EXCHANGE_RATE_API_BASE = os.getenv("EXCHANGE_RATE_API_BASE", "http://api.exchangerate.host")
EXCHANGE_RATE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY")

if not EXCHANGE_RATE_API_KEY:
    raise ValueError("EXCHANGE_RATE_API_KEY environment variable is required. Please set it in your .env file.")


async def fetch_and_store_exchange_rates(db: Session):
    """
    Fetches exchange rates from the external API and stores them in the database.
    
    Args:
        db: Database session
        
    Returns:
        dict: Result containing message, base_currency, timestamp, and counts
        
    Raises:
        Exception: If API call fails or data is invalid
    """
    try:
        api_url = f"{EXCHANGE_RATE_API_BASE}/live?access_key={EXCHANGE_RATE_API_KEY}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(api_url, timeout=10.0)
                response.raise_for_status()
                data = response.json()
            except httpx.TimeoutException:
                logger.error("Timeout while fetching exchange rates from API")
                raise Exception("Exchange rate API request timed out. Please try again later.")
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error from exchange rate API: {e.response.status_code}")
                raise Exception(f"Exchange rate API returned error: {e.response.status_code}")
            except httpx.RequestError as e:
                logger.error(f"Request error while fetching exchange rates: {e}")
                raise Exception("Failed to connect to exchange rate API. Please check your internet connection.")
        
        if not data.get("success", False) or "quotes" not in data:
            error_msg = data.get("error", {}).get("info", "Invalid response from exchange rate API")
            logger.error(f"Invalid API response: {error_msg}")
            raise ValueError(f"Invalid response from exchange rate API: {error_msg}")
        
        base_currency = data.get("source", "USD")
        quotes = data.get("quotes", {})
        timestamp = datetime.utcnow()
        stored_count = 0
        
        for quote_key, rate_value in quotes.items():
            if not quote_key.startswith(base_currency):
                continue
            
            target_currency = quote_key[len(base_currency):]
            if not target_currency or target_currency == base_currency:
                continue
            
            currency_pair = db.query(CurrencyPair).filter(
                CurrencyPair.base_currency == base_currency,
                CurrencyPair.target_currency == target_currency
            ).first()
            
            if not currency_pair:
                currency_pair = CurrencyPair(
                    base_currency=base_currency,
                    target_currency=target_currency
                )
                db.add(currency_pair)
                db.flush()
            
            existing_rate = db.query(ExchangeRate).filter(
                ExchangeRate.currency_pair_id == currency_pair.id,
                ExchangeRate.timestamp >= timestamp - timedelta(minutes=1)
            ).first()
            
            if not existing_rate:
                exchange_rate = ExchangeRate(
                    currency_pair_id=currency_pair.id,
                    rate=rate_value,
                    timestamp=timestamp
                )
                db.add(exchange_rate)
                stored_count += 1
        
        db.commit()
        
        logger.info(f"Fetched and stored {stored_count} exchange rates at {timestamp}")
        
        return {
            "message": f"Successfully fetched and stored {stored_count} exchange rates",
            "base_currency": base_currency,
            "timestamp": timestamp.isoformat(),
            "rates_count": len(quotes),
            "stored_count": stored_count
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in fetch_and_store_exchange_rates: {e}", exc_info=True)
        db.rollback()
        raise
