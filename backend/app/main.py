from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .routers import currency
from .services.exchange_rate_service import fetch_and_store_exchange_rates
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv
import uvicorn
import logging
import os

load_dotenv()

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

app = FastAPI(title="Currency Exchange Rate Tracker API", version="1.0.0")

cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]

logger.info(f"CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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
            trigger=CronTrigger(minute=0),
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
