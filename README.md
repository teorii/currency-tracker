# 💱 Currency Exchange Rate Tracker

A full-stack application for tracking currency exchange rates with real-time data fetching, historical analysis, and an intuitive trading-style interface.

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0+-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178c6.svg)](https://www.typescriptlang.org/)

## Features

- **Real-time Exchange Rates**: Fetches live exchange rates from external APIs
- **Historical Data**: View exchange rate history with configurable time periods (7d, 30d, 90d)
- **Interactive Charts**: Beautiful line charts with TradingView-style interface
- **Currency Pair Management**: Add, remove, and hide currency pairs
- **Automated Data Fetching**: Scheduled hourly updates via background jobs
- **RESTful API**: Well-documented API endpoints for all operations

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Relational database for data storage
- **SQLAlchemy**: ORM for database operations
- **APScheduler**: Background job scheduling
- **httpx**: Async HTTP client for API calls

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Redux Toolkit**: State management
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Chart visualization library
- **Vite**: Fast build tool

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **PostgreSQL 12+** ([Download](https://www.postgresql.org/download/))
- **Node.js 16+** and npm ([Download](https://nodejs.org/))
- **Git** (optional, for cloning)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/currency-tracker.git
cd currency-tracker
```

**Note:** Replace `YOUR_USERNAME` with your actual GitHub username.

### 2. Backend Setup

#### 2.1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

#### 2.2. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 2.3. Set Up PostgreSQL Database

**Option A: Using SQL Script (Recommended)**

```bash
# Connect to PostgreSQL
psql -U postgres

# Run the migration script
\i migrations/001_initial_schema.sql

# Or create database manually
CREATE DATABASE currency_tracker;
\q
```

**Option B: Using pgAdmin (GUI)**

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Enter name: `currency_tracker`
5. Click "Save"
6. Right-click on `currency_tracker` → "Query Tool"
7. Open and run `migrations/001_initial_schema.sql`

**Option C: Using Command Line**

```bash
# Windows (find your PostgreSQL installation)
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE currency_tracker;"

# macOS/Linux
createdb -U postgres currency_tracker
```

#### 2.4. Configure Environment Variables

Create a `.env` file in the `backend` directory by copying the example file:

```bash
# Copy the example file
cd backend
cp .env.example .env
```

Then edit `.env` and fill in your actual values.

**Required Environment Variables (.env file):**

```env
# Database Configuration
# Format: postgresql://username:password@host:port/database_name
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/currency_tracker

# Exchange Rate API Configuration
EXCHANGE_RATE_API_BASE=http://api.exchangerate.host
EXCHANGE_RATE_API_KEY=your_api_key_here

# CORS Configuration (comma-separated list)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173

# Server Configuration (optional)
PORT=8000
HOST=0.0.0.0

# Logging Level (optional)
LOG_LEVEL=INFO
```

**Important:** 
- Replace `your_password` with your actual PostgreSQL password
- Replace `your_api_key_here` with your actual exchange rate API key
- Never commit the `.env` file to version control
- Both `DATABASE_URL` and `EXCHANGE_RATE_API_KEY` are required - the application will not start without them

#### 2.5. Run Database Migrations (Optional)

If you prefer using SQLAlchemy's auto-creation (default), tables will be created automatically on startup. Otherwise, run the SQL migration script manually.

#### 2.6. Start the Backend Server

```bash
# From the backend directory
python -m app.main

# Or using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc

### 3. Frontend Setup

#### 3.1. Install Dependencies

```bash
cd frontend
npm install
```

#### 3.2. Configure API Endpoint (if needed)

The frontend is configured to connect to `http://localhost:8000` by default. If your backend runs on a different port, update:

```typescript
// frontend/src/store/api/ratesApi.ts
const API_BASE_URL = 'http://localhost:8000'; // Change if needed
```

#### 3.3. Start the Development Server

```bash
npm run dev
```

The frontend will be available at:
- **Frontend**: http://localhost:5173

## Project Structure

```
currency-tracker/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── database.py           # Database configuration
│   │   ├── models.py             # SQLAlchemy models
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   └── currency.py       # API endpoints
│   │   └── services/
│   │       ├── __init__.py
│   │       └── exchange_rate_service.py  # Business logic
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Database migration script
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment variables template
│   └── view_db.py                # Utility script to view database
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PairList.tsx      # Currency pairs watchlist
│   │   │   └── PairHistory.tsx    # Historical chart component
│   │   ├── store/
│   │   │   ├── api/
│   │   │   │   └── ratesApi.ts    # Redux API slice
│   │   │   ├── hooks.ts           # Redux hooks
│   │   │   └── store.ts           # Redux store configuration
│   │   ├── App.tsx                # Main application component
│   │   └── main.tsx               # Application entry point
│   ├── package.json               # Node.js dependencies
│   └── vite.config.ts             # Vite configuration
│
└── README.md                      # This file
```

## API Endpoints

### Currency Rates

- `GET /rates/latest` - Get latest exchange rates for all tracked pairs
- `GET /rates/history?base={base}&target={target}&start={start}&end={end}` - Get historical rates
- `POST /rates/fetch-now` - Manually trigger exchange rate fetch
- `GET /rates/pairs` - Get all tracked currency pairs
- `DELETE /rates/pairs/{base}/{target}` - Remove a currency pair

### Example Requests

```bash
# Get latest rates
curl http://localhost:8000/rates/latest

# Get historical data
curl "http://localhost:8000/rates/history?base=USD&target=EUR&start=2026-01-01&end=2026-01-14"

# Fetch new rates
curl -X POST http://localhost:8000/rates/fetch-now

# Delete a pair
curl -X DELETE http://localhost:8000/rates/pairs/USD/EUR
```

## Usage

### Adding Currency Pairs

1. Click "Add Pair" in the watchlist sidebar
2. Enter base currency (e.g., `USD`)
3. Enter target currency (e.g., `EUR`)
4. Click "Add"
5. Click "Fetch Rates" to load data

### Viewing Historical Data

1. Click on any currency pair in the watchlist
2. The chart will display historical rates
3. Use period buttons (7d, 30d, 90d) to change time range

### Managing Pairs

- **Hide Pair**: Click the eye icon to hide a pair (still tracked)
- **Delete Pair**: Click the trash icon to permanently remove a pair and its history
- **Show Hidden**: Click "Show X hidden" to reveal hidden pairs

## Database Schema

### currency_pairs
- `id` (Primary Key)
- `base_currency` (String, indexed)
- `target_currency` (String, indexed)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### exchange_rates
- `id` (Primary Key)
- `currency_pair_id` (Foreign Key → currency_pairs.id)
- `rate` (Decimal, indexed)
- `timestamp` (Timestamp, indexed)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## Troubleshooting

### Database Connection Issues

**Error: `FATAL: password authentication failed`**

- Verify your PostgreSQL password in `.env`
- Ensure `DATABASE_URL` format is correct: `postgresql://user:password@host:port/database`
- Check PostgreSQL is running: `pg_isready` or check service status

**Error: `database "currency_tracker" does not exist`**

- Create the database using one of the methods in section 2.3
- Or run the SQL migration script manually

### Port Already in Use

**Backend (Port 8000):**
```bash
# Find and kill the process
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Or change port in .env or command:
uvicorn app.main:app --reload --port 8001
```

**Frontend (Port 5173):**
```bash
# Change port in vite.config.ts or:
npm run dev -- --port 3000
```

### CORS Errors

If you see CORS errors in the browser console:

1. Ensure backend is running
2. Check `CORS_ORIGINS` in backend `.env` includes your frontend URL
3. Restart the backend server after changing `.env`
4. Verify frontend URL matches exactly (including `http://` vs `https://`)

### Missing Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### Chart Not Showing Data

- Ensure you've clicked "Fetch Rates" at least once
- Check browser console for errors
- Verify backend API is responding: `curl http://localhost:8000/rates/latest`
- Check that the selected pair has historical data

## Development

### Running Tests

```bash
# Backend tests (if implemented)
cd backend
pytest

# Frontend tests (if implemented)
cd frontend
npm test
```

### Code Quality

- **Backend**: Follow PEP 8 style guide
- **Frontend**: ESLint and Prettier configured
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Handle errors gracefully with try-catch blocks

### Environment Variables

Never commit `.env` files to version control. The `.env.example` file serves as a template.

## Production Deployment

**Backend:**
1. Set `LOG_LEVEL=INFO` or `WARNING` in production
2. Use a production ASGI server like Gunicorn with Uvicorn workers
3. Configure proper CORS origins for your domain
4. Use environment variables for all sensitive data
5. Set up database connection pooling

**Frontend:**
1. Build for production: `npm run build`
2. Serve static files with a web server (Nginx, Apache)
3. Configure API endpoint for production backend
4. Enable HTTPS

**Popular Deployment Options:**
- **Backend**: Railway, Render, Heroku, DigitalOcean
- **Frontend**: Vercel, Netlify, GitHub Pages, Cloudflare Pages
- **Full-Stack**: Docker Compose on VPS

## Screenshots

_Add screenshots of your application here to showcase the interface._

## Support

For issues and questions, please open an issue on the repository.

## Author

[Your Name](https://github.com/YOUR_USERNAME)

## Acknowledgments

- Exchange Rate API provided by [exchangerate.host](https://exchangerate.host)
- Built with [FastAPI](https://fastapi.tiangolo.com/) and [React](https://react.dev/)
