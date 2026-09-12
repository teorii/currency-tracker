import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { Health, LatestRates, RateHistory } from '../store/api/ratesApi';

const API = 'http://localhost:8000';

export const latestRates: LatestRates = {
  rates: [
    {
      base_currency: 'USD',
      target_currency: 'EUR',
      rate: 0.85997,
      timestamp: '2026-09-04T01:37:04Z',
      change_24h: 0.0042,
      sparkline: [0.8564, 0.857, 0.8581, 0.8575, 0.8592, 0.85997],
    },
    {
      base_currency: 'USD',
      target_currency: 'JPY',
      rate: 156.024961,
      timestamp: '2026-09-04T01:37:04Z',
      change_24h: -0.0031,
      sparkline: [156.51, 156.4, 156.22, 156.3, 156.1, 156.024961],
    },
  ],
  count: 2,
};

export const usdEurHistory: RateHistory = {
  base_currency: 'USD',
  target_currency: 'EUR',
  start_date: '2026-09-01T00:00:00Z',
  end_date: '2026-09-04T23:59:59Z',
  history: [
    { date: '2026-09-02', timestamp: '2026-09-02T12:00:00Z', rate: 0.86 },
    { date: '2026-09-03', timestamp: '2026-09-03T00:00:00Z', rate: 0.863 },
    { date: '2026-09-03', timestamp: '2026-09-03T12:00:00Z', rate: 0.861 },
  ],
  count: 3,
};

export const health: Health = {
  status: 'ok',
  database: 'up',
  tracked_pairs: 2,
  latest_quote_at: '2026-09-04T01:37:04Z',
};

export const handlers = [
  http.get(`${API}/health`, () => HttpResponse.json(health)),
  http.get(`${API}/rates/latest`, () => HttpResponse.json(latestRates)),
  http.get(`${API}/rates/history`, () => HttpResponse.json(usdEurHistory)),
];

export const server = setupServer(...handlers);
