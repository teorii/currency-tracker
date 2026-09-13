import { useMemo, useState } from 'react';

import { formatAmount, formatClock, formatRate } from '../lib/format';
import { useConvertQuery, useGetPairsQuery, type Conversion } from '../store/api/ratesApi';

interface ConverterProps {
  /** Where to start. Key the component on this so a new selection resets it. */
  from: string;
  to: string;
}

export default function Converter({ from: initialFrom, to: initialTo }: ConverterProps) {
  const [amountText, setAmountText] = useState('100');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const { data: pairs } = useGetPairsQuery();
  const currencies = useMemo(() => currencyOptions(pairs?.pairs ?? [], [from, to]), [pairs, from, to]);

  // One request per pair, not per keystroke: the rate is the server's
  // business and multiplying by it is not.
  const { data: conversion, error, isFetching } = useConvertQuery({ base: from, target: to });

  const amount = Number(amountText);
  const amountIsValid = amountText.trim() !== '' && Number.isFinite(amount) && amount >= 0;
  const result = conversion && amountIsValid ? amount * conversion.rate : null;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <form
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-raised px-5 py-2.5 text-xs"
      aria-label="Converter"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="flex items-center gap-2">
        <span className="text-ink-muted">Convert</span>
        <input
          type="text"
          inputMode="decimal"
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          aria-label="Amount"
          aria-invalid={!amountIsValid}
          className={`tabular w-28 rounded border bg-surface px-2 py-1 text-right text-sm text-ink focus:border-accent ${
            amountIsValid ? 'border-line' : 'border-down'
          }`}
        />
      </label>

      <CurrencySelect label="From" value={from} options={currencies} onChange={setFrom} />

      <button
        type="button"
        onClick={swap}
        className="rounded px-1.5 py-1 text-ink-muted hover:bg-surface-overlay hover:text-ink"
        title="Swap the two currencies"
        aria-label="Swap currencies"
      >
        &#8646;
      </button>

      <CurrencySelect label="To" value={to} options={currencies} onChange={setTo} />

      <output
        className={`ml-auto flex items-baseline gap-3 transition-opacity ${isFetching ? 'opacity-60' : ''}`}
        aria-live="polite"
      >
        {error ? (
          <span className="text-down">No rate held for {from}/{to}.</span>
        ) : result === null || !conversion ? (
          <span className="text-ink-dim">--</span>
        ) : (
          <>
            <span className="tabular text-base text-ink">{formatAmount(result, to)}</span>
            <span className="text-ink-dim">{describe(conversion)}</span>
          </>
        )}
      </output>
    </form>
  );
}

function describe(conversion: Conversion): string {
  const rate = `1 ${conversion.base_currency} = ${formatRate(conversion.rate)} ${conversion.target_currency}`;
  const when = `quoted ${formatClock(conversion.quoted_at)}`;
  switch (conversion.basis) {
    case 'identity':
      return '';
    case 'direct':
      return `${rate}, ${when}`;
    case 'inverse':
      return `${rate}, inverted, ${when}`;
    case 'cross':
      return `${rate}, via ${conversion.via}, ${when}`;
  }
}

/** Every currency a rate is held for, plus whatever is currently chosen so a select never shows blank. */
function currencyOptions(
  pairs: { base_currency: string; target_currency: string }[],
  chosen: string[],
): string[] {
  const codes = new Set<string>(chosen);
  for (const pair of pairs) {
    codes.add(pair.base_currency);
    codes.add(pair.target_currency);
  }
  return [...codes].sort();
}

function CurrencySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (code: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-ink-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded border border-line bg-surface px-2 py-1 text-sm text-ink focus:border-accent"
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  );
}
