import { formatClock } from '../lib/format';
import { useGetHealthQuery } from '../store/api/ratesApi';

const POLL_EVERY_MS = 60_000;

/** Whether the API is up and how fresh its data is, at a glance. */
export default function HealthBadge() {
  const { data, isError } = useGetHealthQuery(undefined, { pollingInterval: POLL_EVERY_MS });

  if (isError) {
    return <Badge tone="down" label="API unreachable" />;
  }
  if (!data) {
    return <Badge tone="dim" label="Connecting" />;
  }
  if (data.status !== 'ok') {
    return <Badge tone="accent" label="Degraded" />;
  }

  const detail = data.latest_quote_at
    ? `quoted ${formatClock(data.latest_quote_at)}`
    : 'no quotes yet';

  return <Badge tone="up" label="Live" detail={detail} />;
}

type Tone = 'up' | 'down' | 'accent' | 'dim';

const DOT: Record<Tone, string> = {
  up: 'bg-up',
  down: 'bg-down',
  accent: 'bg-accent',
  dim: 'bg-ink-dim',
};

function Badge({ tone, label, detail }: { tone: Tone; label: string; detail?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs" role="status">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      <span className="text-ink">{label}</span>
      {detail && <span className="text-ink-dim">{detail}</span>}
    </div>
  );
}
