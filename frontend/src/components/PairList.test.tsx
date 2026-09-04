import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { renderWithStore } from '../test/renderWithStore';
import { server } from '../test/server';
import PairList from './PairList';

describe('PairList', () => {
  it('lists every pair the api returns', async () => {
    renderWithStore(<PairList />);

    expect(await screen.findByText('USD/EUR')).toBeInTheDocument();
    expect(screen.getByText('USD/JPY')).toBeInTheDocument();
  });

  it('shows the rate to four decimal places', async () => {
    renderWithStore(<PairList />);

    expect(await screen.findByText('0.8600')).toBeInTheDocument();
  });

  it('reports the pair that was clicked', async () => {
    const onPairClick = vi.fn();
    renderWithStore(<PairList onPairClick={onPairClick} />);

    await userEvent.click(await screen.findByText('USD/EUR'));

    expect(onPairClick).toHaveBeenCalledWith('USD', 'EUR');
  });

  it('offers a retry when the request fails', async () => {
    server.use(
      http.get('http://localhost:8000/rates/latest', () => new HttpResponse(null, { status: 500 })),
    );

    renderWithStore(<PairList />);

    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('says so when nothing is tracked yet', async () => {
    server.use(
      http.get('http://localhost:8000/rates/latest', () =>
        HttpResponse.json({ rates: [], count: 0 }),
      ),
    );

    renderWithStore(<PairList />);

    await waitFor(() => expect(screen.getByText(/no pairs found/i)).toBeInTheDocument());
  });
});
