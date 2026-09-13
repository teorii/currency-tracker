import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import SessionLocal, engine
from .routers import currency, health
from .services.rates import refresh_rates

settings = get_settings()

# Without this the application's log records have nowhere to go and every
# logger call below is silently discarded.
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def scheduled_refresh() -> None:
    """Scheduler entry point. Owns its own session because no request is in flight."""
    db = SessionLocal()
    try:
        result = await refresh_rates(db)
        logger.info("Scheduled refresh stored %d rates", result.stored)
    except Exception:
        # A failed refresh must not kill the job; the next tick retries.
        logger.exception("Scheduled refresh failed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # The schema belongs to Alembic. An application that quietly reshapes
    # its own database at boot is one that hides a failed migration.
    if settings.scheduler_enabled:
        scheduler.add_job(
            scheduled_refresh,
            trigger=CronTrigger(minute=settings.fetch_schedule_minute),
            id="refresh_rates",
            name="Hourly exchange rate refresh",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(
            "Rates refresh scheduled at minute %d of each hour",
            settings.fetch_schedule_minute,
        )

    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown()
        engine.dispose()


app = FastAPI(
    title="Currency Exchange Rate Tracker API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # So a script on the frontend can read the filename the CSV export sets.
    expose_headers=["Content-Disposition"],
)

app.include_router(health.router)
app.include_router(currency.router)


@app.get("/")
async def read_root() -> dict[str, str]:
    return {"message": "Currency Exchange Rate Tracker API"}


if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port)
