import { useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatClock, formatDateTime, formatRate } from '../lib/format';
import { historyCsvUrl, useGetHistoryQuery } from '../store/api/ratesApi';
import { palette } from '../theme';
import { paddedDomain, summarise, toPoints, type Point } from '../lib/chart';
import Delta from './Delta';

interface RateChartProps {
  base: string;
  target: string;
}

const HOUR = 60 * 60 * 1000;

const PERIODS = [
  { key: '1D', span: 24 * HOUR, ticks: 'time' },
  { key: '1W', span: 7 * 24 * HOUR, ticks: 'date' },
  { key: '1M', span: 30 * 24 * HOUR, ticks: 'date' },
  { key: '3M', span: 90 * 24 * HOUR, ticks: 'date' },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

export default function RateChart({ base, target }: RateChartProps) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('1W');
  const period = PERIODS.find((candidate) => candidate.key === periodKey) ?? PERIODS[1];

  // Fixed when the period changes, not on every render: a fresh end time on
  // each render would be a fresh query argument and an endless refetch.
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - period.span);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [period]);

  const { data, error, isLoading, isFetching } = useGetHistoryQuery({ base, target, ...range });

  const points = useMemo(() => toPoints(data?.history ?? []), [data]);
  const summary = useMemo(() => summarise(points), [points]);

  return (
    <section className="flex h-full flex-col" aria-label={`${base}/${target} history`}>
      <header className="flex items-start justify-between gap-6 border-b border-line px-5 py-3">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-ink-muted">
            {base}/{target}
          </h2>
          {summary ? (
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-medium text-ink">{formatRate(summary.last)}</span>
              <Delta change={summary.change} className="text-sm" />
              <span className="text-2xs text-ink-dim">over {periodKey.toLowerCase()}</span>
            </div>
          ) : (
            <div className="mt-1 text-3xl font-medium text-ink-dim">--</div>
          )}
          {summary && (
            <dl className="tabular mt-1 flex gap-4 text-2xs text-ink-muted">
              <div className="flex gap-1">
                <dt>H</dt>
                <dd className="text-ink">{formatRate(summary.high)}</dd>
              </div>
              <div className="flex gap-1">
                <dt>L</dt>
                <dd className="text-ink">{formatRate(summary.low)}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Quotes</dt>
                <dd className="text-ink">{points.length}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div role="group" aria-label="Period" className="flex gap-1 rounded border border-line p-0.5">
            {PERIODS.map(({ key }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriodKey(key)}
                aria-pressed={key === periodKey}
                className={`rounded px-2.5 py-1 text-xs ${
                  key === periodKey ? 'bg-surface-overlay text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          <a
            href={historyCsvUrl({ base, target, ...range })}
            download
            className={`rounded border border-line px-2.5 py-1 text-xs ${
              summary ? 'text-ink-muted hover:text-ink' : 'pointer-events-none text-ink-dim'
            }`}
            aria-disabled={!summary}
            title={summary ? 'Download this range as CSV' : 'Nothing in this range to download'}
          >
            CSV
          </a>
        </div>
      </header>

      <div
        className={`min-h-0 flex-1 px-2 pb-2 pt-4 transition-opacity ${
          isFetching && !isLoading ? 'opacity-60' : ''
        }`}
      >
        {isLoading ? (
          <Notice>Loading history</Notice>
        ) : error ? (
          <Notice tone="down">Could not load history for {base}/{target}.</Notice>
        ) : summary === null ? (
          <Notice>
            No quotes for {base}/{target} in the last {periodKey.toLowerCase()}. History builds
            up one quote an hour while the refresh job runs.
          </Notice>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rate-wash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.accent} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={palette.line} vertical={false} />
              <XAxis
                dataKey="at"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value: number) => tickLabel(value, period.ticks)}
                tick={{ fill: palette.inkMuted, fontSize: 11 }}
                axisLine={{ stroke: palette.line }}
                tickLine={false}
                minTickGap={96}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={paddedDomain(summary)}
                tickFormatter={formatRate}
                tick={{ fill: palette.inkMuted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
                orientation="right"
              />
              <Tooltip
                cursor={{ stroke: palette.lineStrong, strokeWidth: 1 }}
                content={<ChartTooltip />}
                isAnimationActive={false}
              />
              <Area
                type="linear"
                dataKey="rate"
                stroke={palette.accent}
                strokeWidth={2}
                fill="url(#rate-wash)"
                dot={false}
                activeDot={{ r: 4, fill: palette.accent, stroke: palette.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function tickLabel(value: number, kind: 'time' | 'date'): string {
  return kind === 'time'
    ? formatClock(new Date(value).toISOString())
    : new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface TooltipPayload {
  payload?: Point;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded border border-line bg-surface-raised px-2.5 py-1.5 text-xs shadow-lg">
      <div className="tabular text-sm text-ink">{formatRate(point.rate)}</div>
      <div className="text-ink-muted">{formatDateTime(new Date(point.at).toISOString())}</div>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone?: 'down' }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <p
        className={`max-w-sm text-center text-xs ${tone === 'down' ? 'text-down' : 'text-ink-muted'}`}
      >
        {children}
      </p>
    </div>
  );
}
