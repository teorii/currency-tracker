import logging

from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CurrencyPair, ExchangeRate
from ..schemas import Health

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", response_model=Health)
async def health(response: Response, db: Session = Depends(get_db)) -> Health:
    """Whether the service can reach its database, and how much data it holds.

    Returns 503 when the database is unreachable so a load balancer can act on
    it without parsing the body.
    """
    try:
        pairs = db.execute(select(func.count()).select_from(CurrencyPair)).scalar_one()
        latest = db.execute(select(func.max(ExchangeRate.timestamp))).scalar()
    except SQLAlchemyError:
        logger.exception("Health check could not reach the database")
        response.status_code = 503
        return Health(status="degraded", database="down")

    return Health(
        status="ok",
        database="up",
        tracked_pairs=pairs,
        latest_quote_at=latest,
    )
