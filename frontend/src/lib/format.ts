/**
 * FX rates span several orders of magnitude. Fixed decimals make JPY look
 * like 156.0250 and a pair quoted at 0.000012 look like 0.0000, so the
 * precision follows the magnitude the way a dealing screen would show it.
 */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return '';
  const magnitude = Math.abs(rate);
  if (magnitude >= 100) return rate.toFixed(2);
  if (magnitude >= 1) return rate.toFixed(4);
  if (magnitude === 0) return '0';
  // Below one, keep four significant figures without running past eight places.
  const places = Math.min(8, 3 - Math.floor(Math.log10(magnitude)));
  return rate.toFixed(places);
}

/** A fractional change as a signed percentage. The sign is always present. */
export function formatChange(fraction: number): string {
  const percent = fraction * 100;
  const sign = percent > 0 ? '+' : percent < 0 ? '-' : '';
  return `${sign}${Math.abs(percent).toFixed(2)}%`;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
