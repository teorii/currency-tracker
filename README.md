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
- **SQLite**: Embedded database, no server to run
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

You'll need a few things installed before getting started:

- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **Node.js 16+** and npm ([Download](https://nodejs.org/))

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/currency-tracker.git
cd currency-tracker
```

### Backend Setup

First, let's get the backend up and running.

#### Create Virtual Environment

```bash
cd backend
python -m venv venv
```

Then activate it:
- **Windows**: `venv\Scripts\activate`
- **macOS/Linux**: `source venv/bin/activate`

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Database

There is nothing to set up. The application uses SQLite and creates
`backend/currency_tracker.db` on first run. Apply the schema with:

```bash
alembic upgrade head
```

#### Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Now edit `.env` and add your actual values:

```env
# Exchange Rate API Configuration
EXCHANGE_RATE_API_BASE=http://api.exchangerate.host
EXCHANGE_RATE_API_KEY=your_api_key_here

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173

# Server Configuration
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO
```

Make sure to:
- Replace `your_api_key_here` with your exchange rate API key (get one from [exchangerate.host](https://exchangerate.host))
- Never commit the `.env` file to version control

Only `EXCHANGE_RATE_API_KEY` is required. `DATABASE_URL` is optional and
defaults to a SQLite file beside the application.

#### Start the Backend Server

```bash
python -m app.main
```

Or if you prefer using uvicorn directly:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once it's running, you can access:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc

### Frontend Setup

Now let's get the frontend running.

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Start the Development Server

```bash
npm run dev
```

The frontend will be available at http://localhost:5173. It's already configured to connect to the backend at `http://localhost:8000`, so if your backend is running on a different port, you'll need to update the API URL in `frontend/src/store/api/ratesApi.ts`.

## Project Structure

```
currency-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── database.py           # Database configuration
│   │   ├── models.py             # SQLAlchemy models
│   │   ├── routers/
│   │   │   └── currency.py       # API endpoints
│   │   └── services/
│   │       └── exchange_rate_service.py  # Business logic
│   ├── alembic/
│   │   └── versions/               # Alembic revisions
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Environment variables template
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

Here are the main API endpoints you can use:

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

### Database Issues

**Error: `no such table: currency_pairs`**

The schema has not been applied. Run `alembic upgrade head` from `backend/`.

**Starting over**

The data is all re-fetchable, so deleting `backend/currency_tracker.db` and
running `alembic upgrade head` again is a valid reset.

### Port Already in Use

**Backend (Port 8000):**

On Windows:
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

On macOS/Linux:
```bash
lsof -ti:8000 | xargs kill -9
```

Or just change the port:
```bash
uvicorn app.main:app --reload --port 8001
```

**Frontend (Port 5173):**

```bash
npm run dev -- --port 3000
```

### CORS Errors

If you're seeing CORS errors in the browser:

1. Make sure the backend is running
2. Check that `CORS_ORIGINS` in your backend `.env` includes your frontend URL
3. Restart the backend server after changing `.env`
4. Verify the frontend URL matches exactly (including `http://` vs `https://`)

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

- Make sure you've clicked "Fetch Rates" at least once
- Check the browser console for any errors
- Verify the backend API is responding: `curl http://localhost:8000/rates/latest`
- Check that the selected pair has historical data

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Quality

- **Backend**: Follow PEP 8 style guide
- **Frontend**: ESLint and Prettier are configured
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Handle errors gracefully with try-catch blocks

### Environment Variables

Never commit `.env` files to version control. Use the `.env.example` file as a template.

## Production Deployment

**Backend:**
1. Set `LOG_LEVEL=INFO` or `WARNING` in production
2. Use a production ASGI server like Gunicorn with Uvicorn workers
3. Configure proper CORS origins for your domain
4. Use environment variables for all sensitive data

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

![Main Interface](screenshots/main-interface.png)

## Author

[teorii](https://github.com/teorii)

## Acknowledgments

- Exchange Rate API provided by [exchangerate.host](https://exchangerate.host)
- Built with [FastAPI](https://fastapi.tiangolo.com/) and [React](https://react.dev/)
