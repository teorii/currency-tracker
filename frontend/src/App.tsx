import { useState, useEffect } from 'react';
import PairList from './components/PairList';
import PairHistory from './components/PairHistory';
import { useGetLatestRatesQuery } from './store/api/ratesApi';

// Auto-select first pair if available and none selected
function App() {
  const { data } = useGetLatestRatesQuery();
  const [selectedPair, setSelectedPair] = useState<{ base: string; target: string } | null>(null);

  useEffect(() => {
    if (!selectedPair && data?.rates && data.rates.length > 0) {
      const firstRate = data.rates[0];
      setSelectedPair({ 
        base: firstRate.base_currency, 
        target: firstRate.target_currency 
      });
    }
  }, [data, selectedPair]);

  const handlePairClick = (base: string, target: string) => {
    setSelectedPair({ base, target });
  };

  return (
    <div className="h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-[#131722] border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">
            currency <span className="text-gradient font-bold">exchange</span> tracker
          </h1>
          {selectedPair && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#e5e5e5] font-medium">
                {selectedPair.base}/{selectedPair.target}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart Area - Takes most of the space */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedPair ? (
            <div className="h-full overflow-auto">
              <PairHistory base={selectedPair.base} target={selectedPair.target} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#a0a0a0]">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-light">select a currency pair to view its history</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Watchlist */}
        <div className="w-80 bg-[#131722] border-l border-white/5 flex flex-col overflow-hidden">
          <PairList onPairClick={handlePairClick} selectedPair={selectedPair} />
        </div>
      </div>
    </div>
  );
}

export default App;
