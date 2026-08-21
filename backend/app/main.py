import logging

import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, SessionLocal, engine
from .routers import currency
from .services.exchange_rate_service import fetch_and_store_exchange_rates

settings = get_settings()

# Without this the application's log records have nowhere to go and every
# logger call below is silently discarded.
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

app = FastAPI(title="Currency Exchange Rate Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def scheduled_fetch_rates():
    db = SessionLocal()
    try:
        logger.info("Starting scheduled exchange rate fetch...")
        result = await fetch_and_store_exchange_rates(db)
        logger.info(f"Scheduled fetch completed: {result.get('message', 'Success')}")
    except Exception as e:
        logger.error(f"Error in scheduled fetch: {e}", exc_info=True)
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        logger.warning("Server will start but database operations may fail. Please check your DATABASE_URL.")
    
    try:
        scheduler.add_job(
            scheduled_fetch_rates,
            trigger=CronTrigger(minute=settings.fetch_schedule_minute),
            id='fetch_exchange_rates',
            name='Fetch exchange rates every hour',
            replace_existing=True
        )
        scheduler.start()
        logger.info("Scheduler started: Exchange rates will be fetched every hour")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")
    engine.dispose()

app.include_router(currency.router)

@app.get("/")
async def read_root():
    return {"message": "Currency Exchange Rate Tracker API"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
