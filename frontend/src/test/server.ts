import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { Conversion, Health, LatestRates, RateHistory, TrackedPairs } from '../store/api/ratesApi';

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

export const trackedPairs: TrackedPairs = {
  pairs: [
    {
      base_currency: 'USD',
      target_currency: 'CHF',
      watched: false,
      first_seen: '2026-09-04T01:37:04Z',
      observations: 2,
      latest_quote_at: '2026-09-04T01:37:04Z',
    },
    {
      base_currency: 'USD',
      target_currency: 'EUR',
      watched: true,
      first_seen: '2026-09-04T01:37:04Z',
      observations: 2,
      latest_quote_at: '2026-09-04T01:37:04Z',
    },
    {
      base_currency: 'USD',
      target_currency: 'JPY',
      watched: true,
      first_seen: '2026-09-04T01:37:04Z',
      observations: 2,
      latest_quote_at: '2026-09-04T01:37:04Z',
    },
    {
      base_currency: 'USD',
      target_currency: 'ZAR',
      watched: false,
      first_seen: '2026-09-04T01:37:04Z',
      observations: 2,
      latest_quote_at: '2026-09-04T01:37:04Z',
    },
  ],
  count: 4,
};

export const handlers = [
  http.get(`${API}/rates/convert`, ({ request }) => {
    const url = new URL(request.url);
    const base = url.searchParams.get('base') ?? 'USD';
    const target = url.searchParams.get('target') ?? 'EUR';
    const amount = Number(url.searchParams.get('amount') ?? '1');
    // A small fixed table stands in for the derivation logic, which the backend tests own.
    const table: Record<string, Omit<Conversion, 'amount' | 'converted'>> = {
      'USD/EUR': { base_currency: 'USD', target_currency: 'EUR', rate: 0.86, quoted_at: '2026-09-04T01:37:04Z', basis: 'direct', via: null },
      'EUR/USD': { base_currency: 'EUR', target_currency: 'USD', rate: 1 / 0.86, quoted_at: '2026-09-04T01:37:04Z', basis: 'inverse', via: null },
      'EUR/JPY': { base_currency: 'EUR', target_currency: 'JPY', rate: 181.43, quoted_at: '2026-09-04T01:37:04Z', basis: 'cross', via: 'USD' },
      'USD/USD': { base_currency: 'USD', target_currency: 'USD', rate: 1, quoted_at: '2026-09-04T01:37:04Z', basis: 'identity', via: null },
    };
    const found = table[`${base}/${target}`];
    if (!found) return HttpResponse.json({ detail: 'No rate held' }, { status: 404 });
    return HttpResponse.json({ ...found, amount, converted: amount * found.rate });
  }),
  http.get(`${API}/rates/pairs`, () => HttpResponse.json(trackedPairs)),
  http.patch(`${API}/rates/pairs/:base/:target`, async ({ params, request }) => {
    const { watched } = (await request.json()) as { watched: boolean };
    const pair = trackedPairs.pairs.find((p) => p.target_currency === params.target);
    return HttpResponse.json({ ...pair, watched });
  }),
  http.get(`${API}/health`, () => HttpResponse.json(health)),
  http.get(`${API}/rates/latest`, () => HttpResponse.json(latestRates)),
  http.get(`${API}/rates/history`, () => HttpResponse.json(usdEurHistory)),
];

export const server = setupServer(...handlers);
