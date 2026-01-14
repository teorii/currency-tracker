import { configureStore } from '@reduxjs/toolkit';
import ratesApi from './api/ratesApi';

export const store = configureStore({
  reducer: {
    [ratesApi.reducerPath]: ratesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(ratesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
