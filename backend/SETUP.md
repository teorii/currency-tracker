# Backend Setup

## Requirements

Python 3.11 or newer, and an access key from [exchangerate.host](https://exchangerate.host).
There is no database server to install.

## Quick start

```bash
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS and Linux

pip install -r requirements.txt
cp .env.example .env           # then fill in EXCHANGE_RATE_API_KEY

alembic upgrade head
python -m app.main
```

The database is created at `backend/currency_tracker.db` on first run.

## Configuration

Every value in `.env.example` except the provider key has a working default,
so the only line that has to be filled in is `EXCHANGE_RATE_API_KEY`. Missing
required configuration is reported by name at startup rather than as a
traceback.

Set `DATABASE_URL` to move the database file elsewhere. Set
`SCHEDULER_ENABLED=false` to run the API without the hourly refresh job.

## Checking it works

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/rates/fetch-now
curl http://localhost:8000/rates/latest
```

Interactive documentation is at http://localhost:8000/docs.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
ruff check .
```

The suite runs against an in-memory database and never touches the network or
the development database file.
