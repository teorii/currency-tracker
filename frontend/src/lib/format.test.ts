import { describe, expect, it } from 'vitest';

import { formatChange, formatRate } from './format';

describe('formatRate', () => {
  it('shows two places for large quotes like JPY', () => {
    expect(formatRate(156.024961)).toBe('156.02');
  });

  it('shows four places for quotes near one', () => {
    expect(formatRate(0.85997)).toBe('0.8600');
    expect(formatRate(1.378945)).toBe('1.3789');
  });

  it('keeps four significant figures for small quotes', () => {
    expect(formatRate(0.012345)).toBe('0.01235');
    expect(formatRate(0.0000123456)).toBe('0.00001235');
  });

  it('does not run past eight places', () => {
    expect(formatRate(0.000000012)).toBe('0.00000001');
  });

  it('handles zero and non-finite input', () => {
    expect(formatRate(0)).toBe('0');
    expect(formatRate(Number.NaN)).toBe('');
  });
});

describe('formatChange', () => {
  it('always carries a sign so direction is never colour alone', () => {
    expect(formatChange(0.0042)).toBe('+0.42%');
    expect(formatChange(-0.0042)).toBe('-0.42%');
  });

  it('leaves zero unsigned', () => {
    expect(formatChange(0)).toBe('0.00%');
  });
});
