import { useState } from 'react';
import { useGetLatestRatesQuery, useFetchRatesMutation, useDeletePairMutation } from '../store/api/ratesApi';

interface PairListProps {
  onPairClick?: (base: string, target: string) => void;
  selectedPair?: { base: string; target: string } | null;
}

const PairList = ({ onPairClick, selectedPair }: PairListProps) => {
  const { data, error, isLoading, refetch } = useGetLatestRatesQuery();
  const [fetchRates, { isLoading: isFetching }] = useFetchRatesMutation();
  const [deletePair, { isLoading: isDeleting }] = useDeletePairMutation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [base, setBase] = useState('');
  const [target, setTarget] = useState('');
  const [hiddenPairs, setHiddenPairs] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  const handleFetch = async () => {
    try {
      await fetchRates().unwrap();
      refetch();
    } catch (err) {
      console.error('Failed to fetch rates:', err);
    }
  };

  const handleAddPair = () => {
    if (base.length === 3 && target.length === 3) {
      handleFetch();
      setBase('');
      setTarget('');
      setShowAddForm(false);
    }
  };

  const toggleHidePair = (base: string, target: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pairKey = `${base}/${target}`;
    setHiddenPairs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pairKey)) {
        newSet.delete(pairKey);
      } else {
        newSet.add(pairKey);
      }
      return newSet;
    });
  };

  const handleDeletePair = async (base: string, target: string, e: React.MouseEvent) => {
    e.stopPropagation();
      if (window.confirm(`are you sure you want to permanently delete ${base}/${target} and all its historical data?`)) {
      try {
        await deletePair({ base, target }).unwrap();
        refetch();
        const pairKey = `${base}/${target}`;
        setHiddenPairs(prev => {
          const newSet = new Set(prev);
          newSet.delete(pairKey);
          return newSet;
        });
      } catch (err) {
        console.error('Failed to delete pair:', err);
        alert('failed to delete pair. please try again.');
      }
    }
  };

  const visibleRates = data?.rates.filter(rate => {
    const pairKey = `${rate.base_currency}/${rate.target_currency}`;
    return showHidden || !hiddenPairs.has(pairKey);
  }) || [];

  if (isLoading) {
    return (
      <div className="h-full flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#a0a0a0] text-xs font-light">loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
            <p className="text-red-400 text-xs mb-3 text-center">error loading rates</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs font-medium transition-colors"
            >
              retry
            </button>
      </div>
    );
  }

  const isSelected = (base: string, target: string) => {
    return selectedPair?.base === base && selectedPair?.target === target;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 bg-[#1a1d29]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[#e5e5e5] tracking-wider">watchlist</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-1.5 hover:bg-white/10 rounded text-[#a0a0a0] hover:text-[#e5e5e5] transition-colors"
              title="add pair"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={handleFetch}
              disabled={isFetching}
              className="p-1.5 hover:bg-white/10 rounded text-[#a0a0a0] hover:text-[#e5e5e5] transition-colors disabled:opacity-50"
              title="fetch rates"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        {hiddenPairs.size > 0 && (
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="text-xs text-[#667eea] hover:text-[#764ba2] transition-colors"
          >
            {showHidden ? 'hide' : `show ${hiddenPairs.size} hidden`}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="px-4 py-3 border-b border-white/5 bg-[#1a1d29]">
          <div className="flex gap-2">
            <input
              type="text"
              value={base}
              onChange={(e) => setBase(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="USD"
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-[#e5e5e5] placeholder:text-[#666] focus:outline-none focus:border-[#667eea] transition-all"
              maxLength={3}
            />
            <span className="text-[#667eea] self-center">/</span>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="EUR"
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-[#e5e5e5] placeholder:text-[#666] focus:outline-none focus:border-[#667eea] transition-all"
              maxLength={3}
            />
            <button
              onClick={handleAddPair}
              disabled={base.length !== 3 || target.length !== 3}
              className="px-3 py-1.5 bg-[#667eea] hover:bg-[#5568d3] disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-medium transition-all text-white"
            >
              add
            </button>
          </div>
        </div>
      )}

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto">
        {data?.rates && data.rates.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-[#a0a0a0] font-light">no pairs found. click fetch to load data.</p>
          </div>
        ) : visibleRates.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-[#a0a0a0] font-light">all pairs are hidden.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visibleRates.map((rate, idx) => {
              const pairKey = `${rate.base_currency}/${rate.target_currency}`;
              const isHidden = hiddenPairs.has(pairKey);
              const selected = isSelected(rate.base_currency, rate.target_currency);
              return (
                <div
                  key={idx}
                  className={`px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors duration-150 group ${
                    selected ? 'bg-[#667eea]/20 border-l-2 border-[#667eea]' : ''
                  } ${isHidden ? 'opacity-50' : ''}`}
                  onClick={() => onPairClick?.(rate.base_currency, rate.target_currency)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${selected ? 'text-[#667eea]' : 'text-[#e5e5e5]'}`}>
                          {rate.base_currency}/{rate.target_currency}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[#e5e5e5] font-light">{rate.rate.toFixed(4)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => toggleHidePair(rate.base_currency, rate.target_currency, e)}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-[#a0a0a0] hover:text-[#e5e5e5]"
                        title={isHidden ? 'show pair' : 'hide pair'}
                      >
                        {isHidden ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDeletePair(rate.base_currency, rate.target_currency, e)}
                        disabled={isDeleting}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors text-[#a0a0a0] hover:text-red-400 disabled:opacity-50"
                        title="delete pair"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PairList;
