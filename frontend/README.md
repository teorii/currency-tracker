# Currency Tracker Frontend

React + TypeScript frontend for the Currency Exchange Rate Tracker application.

## Prerequisites

- Node.js 16+ and npm
- Backend server running on http://localhost:8000

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Endpoint

The frontend is configured to connect to `http://localhost:8000` by default. If your backend runs on a different URL, update:

```typescript
// src/store/api/ratesApi.ts
const API_BASE_URL = 'http://localhost:8000'; // Change if needed
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173 (or next available port)

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── PairList.tsx       # Currency pairs watchlist sidebar
│   │   └── PairHistory.tsx    # Historical chart component
│   ├── store/
│   │   ├── api/
│   │   │   └── ratesApi.ts    # Redux Toolkit Query API slice
│   │   ├── hooks.ts           # Redux hooks
│   │   └── store.ts           # Redux store configuration
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles and Tailwind imports
├── public/                      # Static assets
├── package.json                 # Dependencies and scripts
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── tsconfig.json                # TypeScript configuration
```

## Features

- **TradingView-Style Interface**: Chart-focused layout with watchlist sidebar
- **Real-time Rates**: View latest exchange rates for all tracked pairs
- **Historical Charts**: Interactive line charts with configurable time periods (7d, 30d, 90d)
- **Pair Management**: Add, remove, and hide currency pairs
- **Responsive Design**: Works on desktop and mobile devices
- **Loading States**: Visual feedback during data fetching
- **Error Handling**: User-friendly error messages

## Usage

### Adding Currency Pairs

1. Click the "+" button in the watchlist header
2. Enter base currency code (e.g., `USD`)
3. Enter target currency code (e.g., `EUR`)
4. Click "Add"
5. Click the refresh icon to fetch rates

### Viewing Historical Data

1. Click on any currency pair in the watchlist
2. The chart will display historical exchange rates
3. Use period buttons (7d, 30d, 90d) to change the time range
4. Hover over the chart to see detailed rate information

### Managing Pairs

- **Hide Pair**: Hover over a pair and click the eye icon to hide it
- **Delete Pair**: Hover over a pair and click the trash icon to permanently remove it
- **Show Hidden**: Click "Show X hidden" button to reveal hidden pairs
- **Show All**: Click "Show all" at the bottom to view all pairs (if more than 10)

## Development

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Prefer named exports
- Add JSDoc comments for complex functions

### State Management

- Redux Toolkit Query for API state management
- Local component state for UI-only state
- No prop drilling - use Redux for shared state

### Styling

- Tailwind CSS utility classes
- Custom CSS in `index.css` for global styles
- Dark theme with TradingView-inspired colors
- Responsive breakpoints: sm, md, lg, xl

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory. Serve it with any static file server:

```bash
npm run preview
```

Or deploy to services like:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Ensure backend is running on http://localhost:8000
2. Check backend `.env` has `CORS_ORIGINS` including `http://localhost:5173`
3. Restart backend after changing `.env`

### API Connection Issues

- Verify backend is running: `curl http://localhost:8000`
- Check browser console for error messages
- Verify `API_BASE_URL` in `src/store/api/ratesApi.ts`

### Build Errors

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 16+)
- Update dependencies: `npm update`

## Dependencies

### Core
- `react` - UI library
- `react-dom` - React DOM renderer
- `typescript` - Type safety

### State Management
- `@reduxjs/toolkit` - Redux Toolkit
- `react-redux` - React bindings for Redux

### UI & Styling
- `tailwindcss` - Utility-first CSS framework
- `recharts` - Chart library

### Build Tools
- `vite` - Fast build tool
- `@vitejs/plugin-react` - Vite React plugin

## License

[Add your license here]
