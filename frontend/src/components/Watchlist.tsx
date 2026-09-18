import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { formatRate } from '../lib/format';
import {
  useFetchRatesMutation,
  useGetLatestRatesQuery,
  useGetPairsQuery,
  useSetPairWatchedMutation,
  type PairRef,
  type RateSnapshot,
  type TrackedPair,
} from '../store/api/ratesApi';
import Delta from './Delta';
import Sparkline from './Sparkline';

interface WatchlistProps {
  selected: PairRef | null;
  onSelect: (pair: PairRef) => void;
}

const pairKey = (base: string, target: string) => `${base}/${target}`;

const matches = (needle: string, base: string, target: string) =>
  !needle || pairKey(base, target).includes(needle);

export default function Watchlist({ selected, onSelect }: WatchlistProps) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const needle = query.trim().toUpperCase();
  const filterRef = useRef<HTMLInputElement>(null);

  // "/" jumps to the filter from anywhere on the page, unless the keystroke
  // belongs to a field the user is already typing in.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      filterRef.current?.focus();
      filterRef.current?.select();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section className="flex h-full flex-col" aria-label="Watchlist">
      <header className="border-b border-line px-3 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
            {adding ? 'Add pairs' : 'Watchlist'}
          </h2>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              aria-pressed={adding}
              className={`rounded p-1 hover:bg-surface-overlay hover:text-ink ${
                adding ? 'bg-surface-overlay text-accent' : 'text-ink-muted'
              }`}
              title={adding ? 'Back to the watchlist' : 'Add pairs to the watchlist'}
              aria-label={adding ? 'Back to the watchlist' : 'Add pairs'}
            >
              <PlusIcon />
            </button>
            <RefreshButton />
          </div>
        </div>
        <input
          ref={filterRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setQuery('');
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              firstRowIn(event.currentTarget.closest('section'))?.focus();
            }
          }}
          placeholder="Filter pairs, or press /"
          aria-label="Filter pairs"
          className="mt-2 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink placeholder:text-ink-dim focus:border-accent"
        />
      </header>

      {adding ? (
        <AvailablePairs needle={needle} />
      ) : (
        <WatchedPairs needle={needle} selected={selected} onSelect={onSelect} />
      )}
    </section>
  );
}

function WatchedPairs({
  needle,
  selected,
  onSelect,
}: {
  needle: string;
  selected: PairRef | null;
  onSelect: (pair: PairRef) => void;
}) {
  const { data, error, isLoading, isFetching, refetch } = useGetLatestRatesQuery();
  const [setWatched] = useSetPairWatchedMutation();

  const visible = useMemo(
    () => (data?.rates ?? []).filter((r) => matches(needle, r.base_currency, r.target_currency)),
    [data, needle],
  );

  return (
    <div
      className={`flex-1 overflow-y-auto transition-opacity ${
        isFetching && !isLoading ? 'opacity-60' : ''
      }`}
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
        <Status>Nothing on the watchlist. Use + to add pairs.</Status>
      ) : visible.length === 0 ? (
        <Status>Nothing matches &ldquo;{needle}&rdquo;</Status>
      ) : (
        <ul role="list" className="divide-y divide-line/60" onKeyDown={walkRows}>
          {visible.map((rate) => (
            <WatchedRow
              key={pairKey(rate.base_currency, rate.target_currency)}
              rate={rate}
              isSelected={
                selected?.base === rate.base_currency && selected?.target === rate.target_currency
              }
              onSelect={() => onSelect({ base: rate.base_currency, target: rate.target_currency })}
              onRemove={() =>
                setWatched({ base: rate.base_currency, target: rate.target_currency, watched: false })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function WatchedRow({
  rate,
  isSelected,
  onSelect,
  onRemove,
}: {
  rate: RateSnapshot;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
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
        onClick={onRemove}
        aria-label={`Remove ${key} from the watchlist`}
        title="Remove from the watchlist. Its history is kept."
        className="absolute right-1 top-1 rounded p-1 text-ink-dim opacity-0 hover:bg-surface-overlay hover:text-ink focus:opacity-100 group-hover:opacity-100"
      >
        <MinusIcon />
      </button>
    </li>
  );
}

function AvailablePairs({ needle }: { needle: string }) {
  const { data, error, isLoading } = useGetPairsQuery();
  const [setWatched, { isLoading: isSaving }] = useSetPairWatchedMutation();

  const available = useMemo(
    () =>
      (data?.pairs ?? []).filter(
        (p) => !p.watched && matches(needle, p.base_currency, p.target_currency),
      ),
    [data, needle],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <Status>Loading pairs</Status>
      ) : error ? (
        <Status>
          <span className="text-down">Could not load the available pairs.</span>
        </Status>
      ) : available.length === 0 ? (
        <Status>
          {needle ? <>Nothing matches &ldquo;{needle}&rdquo;</> : 'Every pair is already watched.'}
        </Status>
      ) : (
        <ul role="list" className="divide-y divide-line/60" onKeyDown={walkRows}>
          {available.map((pair) => (
            <AvailableRow
              key={pairKey(pair.base_currency, pair.target_currency)}
              pair={pair}
              disabled={isSaving}
              onAdd={() =>
                setWatched({ base: pair.base_currency, target: pair.target_currency, watched: true })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AvailableRow({
  pair,
  disabled,
  onAdd,
}: {
  pair: TrackedPair;
  disabled: boolean;
  onAdd: () => void;
}) {
  const key = pairKey(pair.base_currency, pair.target_currency);
  return (
    <li>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        aria-label={`Add ${key} to the watchlist`}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-raised disabled:opacity-50"
      >
        <span className="text-sm text-ink">{key}</span>
        <span className="tabular text-2xs text-ink-dim">
          {pair.observations} {pair.observations === 1 ? 'quote' : 'quotes'}
        </span>
      </button>
    </li>
  );
}

const ROW = 'li > button:first-of-type';

function firstRowIn(root: Element | null): HTMLElement | null {
  return root?.querySelector<HTMLElement>(ROW) ?? null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Up and down move between rows; Home and End jump to the ends. Focus does the scrolling. */
function walkRows(event: KeyboardEvent<HTMLUListElement>) {
  const moves: Record<string, (index: number, last: number) => number> = {
    ArrowDown: (index, last) => Math.min(index + 1, last),
    ArrowUp: (index) => Math.max(index - 1, 0),
    Home: () => 0,
    End: (_, last) => last,
  };
  const move = moves[event.key];
  if (!move) return;

  const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(ROW));
  const index = rows.findIndex((row) => row === document.activeElement);
  if (index === -1) return;

  event.preventDefault();
  rows[move(index, rows.length - 1)]?.focus();
}

function RefreshButton() {
  const [fetchRates, { isLoading }] = useFetchRatesMutation();
  return (
    <button
      type="button"
      onClick={() => fetchRates()}
      disabled={isLoading}
      className="rounded p-1 text-ink-muted hover:bg-surface-overlay hover:text-ink disabled:opacity-50"
      title="Pull the latest quotes now"
      aria-label="Refresh rates"
    >
      <RefreshIcon spinning={isLoading} />
    </button>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <p className="px-3 py-6 text-center text-xs text-ink-muted">{children}</p>;
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} {...iconProps}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" {...iconProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg className="h-3.5 w-3.5" {...iconProps}>
      <path d="M5 12h14" />
    </svg>
  );
}
