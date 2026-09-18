import { describe, expect, it } from 'vitest';

import { readPair, readParam, updateUrl } from './urlState';

describe('readPair', () => {
  it('reads a pair from the query string, uppercased', () => {
    expect(readPair('?base=usd&target=jpy')).toEqual({ base: 'USD', target: 'JPY' });
  });

  it('is null when either code is missing', () => {
    expect(readPair('?base=USD')).toBeNull();
    expect(readPair('?target=USD')).toBeNull();
    expect(readPair('')).toBeNull();
  });

  it('ignores anything that is not a three letter code', () => {
    expect(readPair('?base=DOLLAR&target=EUR')).toBeNull();
    expect(readPair('?base=US1&target=EUR')).toBeNull();
    expect(readPair('?base=%3Cb%3E&target=EUR')).toBeNull();
  });
});

describe('readParam', () => {
  it('returns the raw value or null', () => {
    expect(readParam('period', '?period=1M')).toBe('1M');
    expect(readParam('period', '?base=USD')).toBeNull();
  });
});

describe('updateUrl', () => {
  it('sets parameters without disturbing the ones it was not given', () => {
    window.history.replaceState(null, '', '/?period=1M&other=kept');

    updateUrl({ base: 'USD', target: 'EUR' });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('base')).toBe('USD');
    expect(params.get('target')).toBe('EUR');
    expect(params.get('period')).toBe('1M');
    expect(params.get('other')).toBe('kept');
  });

  it('removes a parameter given null', () => {
    window.history.replaceState(null, '', '/?base=USD&target=EUR&period=1M');

    updateUrl({ period: null });

    expect(window.location.search).toBe('?base=USD&target=EUR');
  });

  it('does not add a history entry', () => {
    window.history.replaceState(null, '', '/');
    const before = window.history.length;

    updateUrl({ base: 'USD', target: 'EUR' });

    expect(window.history.length).toBe(before);
  });
});
