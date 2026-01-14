# Backend Setup Guide

Quick reference guide for setting up the backend.

## Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/currency_tracker

# Exchange Rate API Configuration
EXCHANGE_RATE_API_BASE=http://api.exchangerate.host
EXCHANGE_RATE_API_KEY=your_api_key_here  # REQUIRED - Get your key from exchangerate.host

# CORS Configuration
CORS_ORIGINS=http://localhost:5173

# Optional
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO
```

## Quick Start Commands

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create database (using psql)
psql -U postgres -c "CREATE DATABASE currency_tracker;"

# 5. Run migrations (optional - tables auto-create on startup)
psql -U postgres -d currency_tracker -f migrations/001_initial_schema.sql

# 6. Start server
python -m app.main
```

## Verify Setup

```bash
# Test API
curl http://localhost:8000

# Test latest rates endpoint
curl http://localhost:8000/rates/latest

# View API documentation
# Open http://localhost:8000/docs in browser
```
