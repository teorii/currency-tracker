/**
 * The palette, in one place. tailwind.config.ts builds its colour scale from
 * this and the chart components read it directly, so a value changed here
 * changes everywhere.
 *
 * Validated for the dark surface: every colour sits inside the dark-mode
 * lightness band and clears 3:1 against `surface`. Red and green are close
 * under deuteranopia, which is why a delta always carries a sign as well.
 */
export const palette = {
  surface: '#0b0e14',
  surfaceRaised: '#11151c',
  surfaceOverlay: '#171c25',

  line: '#1f2631',
  lineStrong: '#2c3543',

  ink: '#e6e8eb',
  inkMuted: '#8b93a1',
  inkDim: '#5c6470',

  accent: '#c98500',
  up: '#199e70',
  down: '#e5484d',
} as const;

export const fontMono = [
  '"JetBrains Mono"',
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Consolas',
  'monospace',
];
