import type { Config } from 'tailwindcss';

import { fontMono, palette } from './src/theme';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: palette.surface,
          raised: palette.surfaceRaised,
          overlay: palette.surfaceOverlay,
        },
        line: {
          DEFAULT: palette.line,
          strong: palette.lineStrong,
        },
        ink: {
          DEFAULT: palette.ink,
          muted: palette.inkMuted,
          dim: palette.inkDim,
        },
        accent: palette.accent,
        up: palette.up,
        down: palette.down,
      },
      fontFamily: {
        mono: fontMono,
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
