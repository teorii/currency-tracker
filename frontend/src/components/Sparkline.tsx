import { palette } from '../theme';

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * The shape of the last day, nothing more. No axes, no labels: the row beside
 * it carries the numbers. Coloured by where it ended relative to where it began.
 */
export default function Sparkline({ points, width = 64, height = 20, className }: SparklineProps) {
  if (points.length < 2) {
    return <span className={className} style={{ width, height }} aria-hidden="true" />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  // Inset so the 1.5px stroke is not clipped at the extremes.
  const inset = 1.5;
  const step = (width - inset * 2) / (points.length - 1);

  const path = points
    .map((value, index) => {
      const x = inset + index * step;
      const y = inset + (1 - (value - min) / span) * (height - inset * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const first = points[0];
  const last = points[points.length - 1];
  const stroke = last > first ? palette.up : last < first ? palette.down : palette.inkMuted;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
