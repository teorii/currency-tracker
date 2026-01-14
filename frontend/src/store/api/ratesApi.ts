import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = 'http://localhost:8000';

export interface Rate {
  base_currency: string;
  target_currency: string;
  rate: number;
  timestamp: string;
}

export interface LatestRatesResponse {
  rates: Rate[];
  count: number;
}

export interface HistoryData {
  date: string;
  timestamp: string;
  rate: number;
}

export interface HistoryResponse {
  base_currency: string;
  target_currency: string;
  start_date: string;
  end_date: string;
  history: HistoryData[];
  count: number;
}

const ratesApi = createApi({
  reducerPath: 'ratesApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Rates'],
  endpoints: (builder) => ({
    getLatestRates: builder.query<LatestRatesResponse, void>({
      query: () => '/rates/latest',
      providesTags: ['Rates'],
    }),
    getHistory: builder.query<HistoryResponse, { base: string; target: string; start: string; end: string }>({
      query: ({ base, target, start, end }) => 
        `/rates/history?base=${base}&target=${target}&start=${start}&end=${end}`,
    }),
    fetchRates: builder.mutation<any, void>({
      query: () => ({
        url: '/rates/fetch-now',
        method: 'POST',
      }),
      invalidatesTags: ['Rates'],
    }),
    deletePair: builder.mutation<any, { base: string; target: string }>({
      query: ({ base, target }) => ({
        url: `/rates/pairs/${base}/${target}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Rates'],
    }),
  }),
});

export const { useGetLatestRatesQuery, useGetHistoryQuery, useFetchRatesMutation, useDeletePairMutation } = ratesApi;
export default ratesApi;
