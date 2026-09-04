import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';

import ratesApi from '../store/api/ratesApi';

/**
 * Renders inside a store built for this test alone.
 *
 * The application store is a module singleton, so sharing it would let one
 * test's cached queries answer another's.
 */
export function renderWithStore(ui: ReactElement) {
  const store = configureStore({
    reducer: { [ratesApi.reducerPath]: ratesApi.reducer },
    middleware: (getDefault) => getDefault().concat(ratesApi.middleware),
  });

  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}
