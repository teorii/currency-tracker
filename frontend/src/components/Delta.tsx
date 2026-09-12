import { formatChange } from '../lib/format';

interface DeltaProps {
  /** Fractional change. null means there is not yet a second quote to compare. */
  change: number | null;
  className?: string;
}

/** A signed percentage, coloured by direction. The sign carries the meaning; the colour repeats it. */
export default function Delta({ change, className = '' }: DeltaProps) {
  if (change === null) {
    return (
      <span className={`text-ink-dim ${className}`} title="No earlier quote to compare against">
        --
      </span>
    );
  }

  const tone = change > 0 ? 'text-up' : change < 0 ? 'text-down' : 'text-ink-muted';

  return <span className={`tabular ${tone} ${className}`}>{formatChange(change)}</span>;
}
