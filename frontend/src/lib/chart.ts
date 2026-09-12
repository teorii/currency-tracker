import type { HistoryPoint } from '../store/api/ratesApi';

export interface Point {
  at: number;
  rate: number;
}

export function toPoints(history: HistoryPoint[]): Point[] {
  return history.map((point) => ({ at: Date.parse(point.timestamp), rate: point.rate }));
}

export interface Summary {
  first: number;
  last: number;
  high: number;
  low: number;
  change: number | null;
}

export function summarise(points: Point[]): Summary | null {
  if (points.length === 0) return null;
  const rates = points.map((point) => point.rate);
  const first = rates[0];
  const last = rates[rates.length - 1];
  return {
    first,
    last,
    high: Math.max(...rates),
    low: Math.min(...rates),
    change: points.length > 1 && first !== 0 ? (last - first) / first : null,
  };
}

/**
 * The visible range never drops below a fraction of the rate. Without that
 * floor a pegged pair, which moves only by rounding noise, has that noise
 * stretched across the whole plot and reads as a rally. Real movement clears
 * the floor easily; a 1% move is five times wider than it.
 */
export function paddedDomain(summary: Summary): [number, number] {
  const span = summary.high - summary.low;
  const floor = Math.abs(summary.last) * 0.002 || 0.0001;
  const half = (Math.max(span, floor) / 2) * 1.3;
  const mid = (summary.high + summary.low) / 2;
  return [mid - half, mid + half];
}

