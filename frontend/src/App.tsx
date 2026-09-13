import { useState } from 'react';

import Converter from './components/Converter';
import HealthBadge from './components/HealthBadge';
import RateChart from './components/RateChart';
import Watchlist, { type Pair } from './components/Watchlist';
import { useGetLatestRatesQuery } from './store/api/ratesApi';

export default function App() {
  const { data } = useGetLatestRatesQuery();
  const [chosenPair, setChosenPair] = useState<Pair | null>(null);

  // Derived rather than stored, so the first pair shows as soon as rates
  // arrive without an effect writing state on the render that receives them.
  const firstRate = data?.rates[0];
  const selectedPair =
    chosenPair ??
    (firstRate ? { base: firstRate.base_currency, target: firstRate.target_currency } : null);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-line bg-surface-raised px-5 py-2.5">
        <h1 className="text-sm font-medium tracking-tight text-ink">
          <span className="text-accent">fx</span>tracker
        </h1>
        <HealthBadge />
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {selectedPair ? (
            <>
              <div className="min-h-0 flex-1">
                <RateChart base={selectedPair.base} target={selectedPair.target} />
              </div>
              <Converter
                key={`${selectedPair.base}/${selectedPair.target}`}
                from={selectedPair.base}
                to={selectedPair.target}
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-ink-muted">Select a pair to see its history.</p>
            </div>
          )}
        </main>

        <aside className="w-80 shrink-0 border-l border-line bg-surface-raised">
          <Watchlist selected={selectedPair} onSelect={setChosenPair} />
        </aside>
      </div>
    </div>
  );
}
