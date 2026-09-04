import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { LatestRates, RateHistory } from '../store/api/ratesApi';

const API = 'http://localhost:8000';

export const latestRates: LatestRates = {
  rates: [
    {
      base_currency: 'USD',
      target_currency: 'EUR',
      rate: 0.85997,
      timestamp: '2026-09-04T01:37:04Z',
    },
    {
      base_currency: 'USD',
      target_currency: 'JPY',
      rate: 156.024961,
      timestamp: '2026-09-04T01:37:04Z',
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
    { date: '2026-09-03', timestamp: '2026-09-03T12:00:00Z', rate: 0.861 },
  ],
  count: 2,
};

export const handlers = [
  http.get(`${API}/rates/latest`, () => HttpResponse.json(latestRates)),
  http.get(`${API}/rates/history`, () => HttpResponse.json(usdEurHistory)),
];

export const server = setupServer(...handlers);
