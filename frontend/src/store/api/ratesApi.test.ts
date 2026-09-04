import { describe, expect, it } from 'vitest';

import { historyCsvUrl } from './ratesApi';

describe('historyCsvUrl', () => {
  it('points at the export endpoint with the range as query parameters', () => {
    const url = new URL(
      historyCsvUrl({ base: 'USD', target: 'EUR', start: '2026-09-01', end: '2026-09-30' }),
    );

    expect(url.pathname).toBe('/rates/history.csv');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      base: 'USD',
      target: 'EUR',
      start: '2026-09-01',
      end: '2026-09-30',
    });
  });

  it('escapes values rather than pasting them into the query string', () => {
    const url = new URL(
      historyCsvUrl({ base: 'US D&x', target: 'EUR', start: '2026-09-01', end: '2026-09-30' }),
    );

    expect(url.searchParams.get('base')).toBe('US D&x');
    expect(url.searchParams.get('target')).toBe('EUR');
  });
});
