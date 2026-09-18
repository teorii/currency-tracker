import type { PairRef } from '../store/api/ratesApi';

const CODE = /^[A-Za-z]{3}$/;

/**
 * The selected pair and period live in the query string so a view can be
 * bookmarked or shared. Only explicit choices are written; the pair the app
 * falls back to on load leaves the URL alone, and a malformed value is
 * ignored rather than trusted.
 */
export function readPair(search: string = window.location.search): PairRef | null {
  const params = new URLSearchParams(search);
  const base = params.get('base');
  const target = params.get('target');
  if (!base || !target || !CODE.test(base) || !CODE.test(target)) return null;
  return { base: base.toUpperCase(), target: target.toUpperCase() };
}

export function readParam(key: string, search: string = window.location.search): string | null {
  return new URLSearchParams(search).get(key);
}

/** Set or remove query parameters in place. Null removes. No history entry is added. */
export function updateUrl(changes: Record<string, string | null>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(window.history.state, '', url);
}
