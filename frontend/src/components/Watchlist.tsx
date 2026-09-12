import { useMemo, useState, type ReactNode } from 'react';

import { formatRate } from '../lib/format';
import {
  useDeletePairMutation,
  useFetchRatesMutation,
  useGetLatestRatesQuery,
  type RateSnapshot,
} from '../store/api/ratesApi';
import Delta from './Delta';
import Sparkline from './Sparkline';

export interface Pair {
  base: string;
  target: string;
}

interface WatchlistProps {
  selected: Pair | null;
  onSelect: (pair: Pair) => void;
}

const pairKey = (base: string, target: string) => `${base}/${target}`;

export default function Watchlist({ selected, onSelect }: WatchlistProps) {
  const { data, error, isLoading, isFetching, refetch } = useGetLatestRatesQuery();
  const [fetchRates, { isLoading: isRefreshing }] = useFetchRatesMutation();
  const [deletePair] = useDeletePairMutation();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const rates = data?.rates ?? [];
    const needle = query.trim().toUpperCase();
    if (!needle) return rates;
    return rates.filter((rate) =>
      pairKey(rate.base_currency, rate.target_currency).includes(needle),
    );
  }, [data, query]);

  const handleDelete = async (rate: RateSnapshot) => {
    const key = pairKey(rate.base_currency, rate.target_currency);
    if (!window.confirm(`Delete ${key} and every rate recorded for it?`)) return;
    await deletePair({ base: rate.base_currency, target: rate.target_currency });
  };

  return (
    <section className="flex h-full flex-col" aria-label="Watchlist">
      <header className="border-b border-line px-3 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
            Watchlist
            {data && <span className="ml-2 tabular text-ink-dim">{data.count}</span>}
          </h2>
          <button
            type="button"
            onClick={() => fetchRates()}
            disabled={isRefreshing}
            className="rounded p-1 text-ink-muted hover:bg-surface-overlay hover:text-ink disabled:opacity-50"
            title="Pull the latest quotes now"
            aria-label="Refresh rates"
          >
            <RefreshIcon spinning={isRefreshing} />
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter pairs"
          aria-label="Filter pairs"
          className="mt-2 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink placeholder:text-ink-dim focus:border-accent"
        />
      </header>

      <div
        className={`flex-1 overflow-y-auto transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}
      >
        {isLoading ? (
          <Status>Loading rates</Status>
        ) : error ? (
          <Status>
            <span className="text-down">Could not load rates.</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="ml-2 underline decoration-ink-dim hover:text-ink"
            >
              Retry
            </button>
          </Status>
        ) : data?.count === 0 ? (
          <Status>No pairs yet. Refresh to pull the first quotes.</Status>
        ) : visible.length === 0 ? (
          <Status>Nothing matches &ldquo;{query.trim()}&rdquo;</Status>
        ) : (
          <ul role="list" className="divide-y divide-line/60">
            {visible.map((rate) => {
              const isSelected =
                selected?.base === rate.base_currency && selected?.target === rate.target_currency;
              return (
                <WatchlistRow
                  key={pairKey(rate.base_currency, rate.target_currency)}
                  rate={rate}
                  isSelected={isSelected}
                  onSelect={() => onSelect({ base: rate.base_currency, target: rate.target_currency })}
                  onDelete={() => handleDelete(rate)}
                />
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

interface WatchlistRowProps {
  rate: RateSnapshot;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function WatchlistRow({ rate, isSelected, onSelect, onDelete }: WatchlistRowProps) {
  const key = pairKey(rate.base_currency, rate.target_currency);
  return (
    <li
      className={`group relative flex items-center border-l-2 ${
        isSelected ? 'border-accent bg-surface-overlay' : 'border-transparent hover:bg-surface-raised'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-left"
      >
        <span className="flex flex-col">
          <span className="text-sm text-ink">{key}</span>
          <Delta change={rate.change_24h} className="text-2xs" />
        </span>
        <Sparkline points={rate.sparkline} className="text-ink-dim" />
        <span className="tabular w-[9ch] text-right text-sm text-ink">{formatRate(rate.rate)}</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${key}`}
        title={`Delete ${key}`}
        className="absolute right-1 top-1 rounded p-1 text-ink-dim opacity-0 hover:bg-down/20 hover:text-down focus:opacity-100 group-hover:opacity-100"
      >
        <TrashIcon />
      </button>
    </li>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <p className="px-3 py-6 text-center text-xs text-ink-muted">{children}</p>;
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}
