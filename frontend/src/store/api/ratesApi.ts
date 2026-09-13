import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/** ISO 8601 string as the API serialises datetimes. */
type Timestamp = string;

export interface RateSnapshot {
  base_currency: string;
  target_currency: string;
  rate: number;
  timestamp: Timestamp;
  /** Fractional change over the trailing day, or null until a second quote exists. */
  change_24h: number | null;
  /** Quotes inside the trailing day, oldest first. Empty until a second refresh. */
  sparkline: number[];
}

export interface LatestRates {
  rates: RateSnapshot[];
  count: number;
}

export interface HistoryPoint {
  date: string;
  timestamp: Timestamp;
  rate: number;
}

export interface RateHistory {
  base_currency: string;
  target_currency: string;
  start_date: Timestamp;
  end_date: Timestamp;
  history: HistoryPoint[];
  count: number;
}

export interface TrackedPair {
  base_currency: string;
  target_currency: string;
  watched: boolean;
  first_seen: Timestamp;
  observations: number;
  latest_quote_at: Timestamp | null;
}

export interface TrackedPairs {
  pairs: TrackedPair[];
  count: number;
}

/** How a rate was arrived at. `cross` means it was computed through `via`. */
export type ConversionBasis = 'identity' | 'direct' | 'inverse' | 'cross';

export interface Conversion {
  base_currency: string;
  target_currency: string;
  amount: number;
  rate: number;
  converted: number;
  quoted_at: Timestamp;
  basis: ConversionBasis;
  via: string | null;
}

export interface FetchResult {
  base_currency: string;
  quoted_at: Timestamp;
  received: number;
  stored: number;
}

export interface Health {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  tracked_pairs: number | null;
  latest_quote_at: Timestamp | null;
}

export interface Deleted {
  message: string;
}

export interface HistoryRange {
  base: string;
  target: string;
  start: string;
  end: string;
}

export interface ConvertRequest {
  base: string;
  target: string;
  amount?: number;
}

export interface PairRef {
  base: string;
  target: string;
}

export interface WatchRequest extends PairRef {
  watched: boolean;
}

/** A URL for the CSV export, for use as an href rather than a fetch. */
export const historyCsvUrl = ({ base, target, start, end }: HistoryRange): string =>
  `${API_BASE_URL}/rates/history.csv?${new URLSearchParams({ base, target, start, end })}`;

const ratesApi = createApi({
  reducerPath: 'ratesApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Rates', 'Pairs'],
  endpoints: (builder) => ({
    getHealth: builder.query<Health, void>({
      query: () => '/health',
    }),
    getLatestRates: builder.query<LatestRates, void>({
      query: () => '/rates/latest',
      providesTags: ['Rates'],
    }),
    getPairs: builder.query<TrackedPairs, void>({
      query: () => '/rates/pairs',
      providesTags: ['Pairs'],
    }),
    getHistory: builder.query<RateHistory, HistoryRange>({
      query: ({ base, target, start, end }) => ({
        url: '/rates/history',
        params: { base, target, start, end },
      }),
      providesTags: ['Rates'],
    }),
    convert: builder.query<Conversion, ConvertRequest>({
      query: ({ base, target, amount = 1 }) => ({
        url: '/rates/convert',
        params: { base, target, amount },
      }),
      providesTags: ['Rates'],
    }),
    fetchRates: builder.mutation<FetchResult, void>({
      query: () => ({ url: '/rates/fetch-now', method: 'POST' }),
      invalidatesTags: ['Rates', 'Pairs'],
    }),
    setPairWatched: builder.mutation<TrackedPair, WatchRequest>({
      query: ({ base, target, watched }) => ({
        url: `/rates/pairs/${base}/${target}`,
        method: 'PATCH',
        body: { watched },
      }),
      invalidatesTags: ['Rates', 'Pairs'],
    }),
    deletePair: builder.mutation<Deleted, PairRef>({
      query: ({ base, target }) => ({
        url: `/rates/pairs/${base}/${target}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Rates', 'Pairs'],
    }),
  }),
});

export const {
  useGetHealthQuery,
  useGetLatestRatesQuery,
  useGetPairsQuery,
  useGetHistoryQuery,
  useConvertQuery,
  useFetchRatesMutation,
  useSetPairWatchedMutation,
  useDeletePairMutation,
} = ratesApi;

export default ratesApi;
