import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useGetHistoryQuery } from '../store/api/ratesApi';

interface PairHistoryProps {
  base: string;
  target: string;
}

type TimePeriod = '1d' | '7d' | '30d' | '90d';

// For 1d, we want to include the full day, so set start to beginning of yesterday
// Use date-only format (YYYY-MM-DD)
// Calculate latest rate and stats if we have data
// Aggregate data by date to show one point per day (average rate for that day)
// Calculate domain with padding to prevent false movements
// 10% padding, or minimal padding if flat
const PairHistory = ({ base, target }: PairHistoryProps) => {
  const [period, setPeriod] = useState<TimePeriod>('7d');
  
  const getStartDate = (period: TimePeriod): Date => {
    const now = new Date();
    const start = new Date(now);
    
    switch (period) {
      case '1d':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
    }
    
    return start;
  };
  
  const endDate = new Date();
  const startDate = getStartDate(period);
  
  if (period === '1d') {
    startDate.setHours(0, 0, 0, 0);
  }
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const { data, error, isLoading } = useGetHistoryQuery({
    base,
    target,
    start: startStr,
    end: endStr,
  });

  let latestRate: number | null = null;
  let minRate: number | null = null;
  let maxRate: number | null = null;
  let chartData: Array<{ date: string; rate: number; fullDate: number }> = [];
  
  if (data?.history && Array.isArray(data.history) && data.history.length > 0) {
    const dataByDate = new Map<string, { rates: number[], timestamp: string }>();
    
    data.history.forEach((item) => {
      const dateKey = new Date(item.timestamp).toISOString().split('T')[0];
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, { rates: [], timestamp: item.timestamp });
      }
      dataByDate.get(dateKey)!.rates.push(Number(item.rate));
    });

    chartData = Array.from(dataByDate.entries())
      .map(([dateKey, { rates, timestamp }]) => ({
        date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: rates.reduce((a, b) => a + b, 0) / rates.length,
        fullDate: new Date(timestamp).getTime(),
      }))
      .sort((a, b) => a.fullDate - b.fullDate);

    latestRate = chartData.length > 0 ? chartData[chartData.length - 1].rate : null;
    const allRates = chartData.map(d => d.rate);
    minRate = allRates.length > 0 ? Math.min(...allRates) : null;
    maxRate = allRates.length > 0 ? Math.max(...allRates) : null;
  }

  const rateRange = maxRate && minRate ? maxRate - minRate : 0;
  const padding = rateRange > 0 ? rateRange * 0.1 : 0.0001;
  
  const yAxisDomain = minRate && maxRate 
    ? [minRate - padding, maxRate + padding]
    : ['auto', 'auto'];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Chart Controls Bar */}
      <div className="px-6 py-3 border-b border-white/5 bg-[#131722] flex items-center justify-between">
        <div className="flex items-center gap-6">
          {latestRate !== null && (
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-[#a0a0a0] font-light">last</span>
                <span className="ml-2 text-lg text-[#e5e5e5] font-medium">{latestRate.toFixed(4)}</span>
              </div>
              {minRate !== null && maxRate !== null && (
                <div className="text-xs text-[#a0a0a0]">
                  <span>h: </span><span className="text-[#e5e5e5]">{maxRate.toFixed(4)}</span>
                  <span className="mx-2">l: </span><span className="text-[#e5e5e5]">{minRate.toFixed(4)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(['1d', '7d', '30d', '90d'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                period === p
                  ? 'bg-[#667eea] text-white'
                  : 'bg-white/5 text-[#a0a0a0] hover:bg-white/10 hover:text-[#e5e5e5]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="h-full flex justify-center items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[#a0a0a0] text-sm font-light">loading history...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md">
              <p className="text-red-400 font-light">error loading history. try selecting a different pair or adjusting the date range.</p>
            </div>
          </div>
        ) : !data || !data.history || data.history.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 max-w-md">
              <p className="text-yellow-400 font-light">no historical data available for {base}/{target} in the selected range.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="#a0a0a0"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#a0a0a0' }}
            />
            <YAxis 
              stroke="#a0a0a0"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#a0a0a0' }}
              tickFormatter={(value) => value.toFixed(4)}
              domain={yAxisDomain}
              width={80}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(26, 26, 26, 0.95)', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#e5e5e5',
                padding: '12px'
              }}
              labelStyle={{ color: '#a0a0a0', marginBottom: '8px', fontSize: '12px' }}
              formatter={(value: number) => [value.toFixed(4), 'rate']}
              labelFormatter={(label) => `date: ${label}`}
            />
            <Legend 
              wrapperStyle={{ color: '#a0a0a0', fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="url(#colorGradient)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: '#667eea' }}
              name={`${base}/${target} rate`}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PairHistory;
