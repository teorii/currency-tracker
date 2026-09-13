import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { renderWithStore } from '../test/renderWithStore';
import { server, trackedPairs } from '../test/server';
import Watchlist from './Watchlist';

const noop = () => {};

describe('Watchlist', () => {
  it('lists every pair with its rate at a sensible precision', async () => {
    renderWithStore(<Watchlist selected={null} onSelect={noop} />);

    const eur = await screen.findByRole('button', { name: /^USD\/EUR/ });
    expect(within(eur).getByText('0.8600')).toBeInTheDocument();

    const jpy = screen.getByRole('button', { name: /^USD\/JPY/ });
    expect(within(jpy).getByText('156.02')).toBeInTheDocument();
  });

  it('shows each change with an explicit sign', async () => {
    renderWithStore(<Watchlist selected={null} onSelect={noop} />);

    expect(await screen.findByText('+0.42%')).toBeInTheDocument();
    expect(screen.getByText('-0.31%')).toBeInTheDocument();
  });

  it('reports the pair that was chosen', async () => {
    const onSelect = vi.fn();
    renderWithStore(<Watchlist selected={null} onSelect={onSelect} />);

    await userEvent.click(await screen.findByRole('button', { name: /^USD\/JPY/ }));

    expect(onSelect).toHaveBeenCalledWith({ base: 'USD', target: 'JPY' });
  });

  it('marks the selected pair', async () => {
    renderWithStore(<Watchlist selected={{ base: 'USD', target: 'EUR' }} onSelect={noop} />);

    expect(await screen.findByRole('button', { name: /^USD\/EUR/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^USD\/JPY/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('filters by either code in the pair, ignoring case', async () => {
    renderWithStore(<Watchlist selected={null} onSelect={noop} />);
    await screen.findByRole('button', { name: /^USD\/EUR/ });

    await userEvent.type(screen.getByRole('searchbox', { name: /filter pairs/i }), 'jpy');

    expect(screen.queryByRole('button', { name: /^USD\/EUR/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^USD\/JPY/ })).toBeInTheDocument();
  });

  it('says when nothing matches the filter', async () => {
    renderWithStore(<Watchlist selected={null} onSelect={noop} />);
    await screen.findByRole('button', { name: /^USD\/EUR/ });

    await userEvent.type(screen.getByRole('searchbox', { name: /filter pairs/i }), 'zzz');

    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
  });

  it('offers a retry when the request fails', async () => {
    server.use(
      http.get('http://localhost:8000/rates/latest', () => new HttpResponse(null, { status: 500 })),
    );

    renderWithStore(<Watchlist selected={null} onSelect={noop} />);

    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows a placeholder instead of a change when there is no earlier quote', async () => {
    server.use(
      http.get('http://localhost:8000/rates/latest', () =>
        HttpResponse.json({
          rates: [
            {
              base_currency: 'USD',
              target_currency: 'CHF',
              rate: 0.8,
              timestamp: '2026-09-04T01:37:04Z',
              change_24h: null,
              sparkline: [0.8],
            },
          ],
          count: 1,
        }),
      ),
    );

    renderWithStore(<Watchlist selected={null} onSelect={noop} />);

    const row = await screen.findByRole('button', { name: /^USD\/CHF/ });
    expect(within(row).getByText('--')).toBeInTheDocument();
  });

  it('removes a pair from the watchlist without a confirmation', async () => {
    const patched: string[] = [];
    server.use(
      http.patch('http://localhost:8000/rates/pairs/:base/:target', async ({ params, request }) => {
        const body = (await request.json()) as { watched: boolean };
        patched.push(`${params.base}/${params.target}:${body.watched}`);
        return HttpResponse.json({ ...trackedPairs.pairs[1], watched: body.watched });
      }),
    );
    renderWithStore(<Watchlist selected={null} onSelect={noop} />);
    await screen.findByRole('button', { name: /^USD\/EUR/ });

    await userEvent.click(screen.getByRole('button', { name: 'Remove USD/EUR from the watchlist' }));

    await waitFor(() => expect(patched).toEqual(['USD/EUR:false']));
  });

  it('lists only the unwatched pairs when adding', async () => {
    renderWithStore(<Watchlist selected={null} onSelect={noop} />);
    await screen.findByRole('button', { name: /^USD\/EUR/ });

    await userEvent.click(screen.getByRole('button', { name: 'Add pairs' }));

    expect(await screen.findByRole('button', { name: 'Add USD/CHF to the watchlist' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add USD/ZAR to the watchlist' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add USD\/EUR/ })).not.toBeInTheDocument();
  });

  it('watches a pair chosen from the add list', async () => {
    const patched: string[] = [];
    server.use(
      http.patch('http://localhost:8000/rates/pairs/:base/:target', async ({ params, request }) => {
        const body = (await request.json()) as { watched: boolean };
        patched.push(`${params.base}/${params.target}:${body.watched}`);
        return HttpResponse.json({ ...trackedPairs.pairs[0], watched: body.watched });
      }),
    );
    renderWithStore(<Watchlist selected={null} onSelect={noop} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add pairs' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Add USD/CHF to the watchlist' }));

    await waitFor(() => expect(patched).toEqual(['USD/CHF:true']));
  });

  it('applies the filter to the add list as well', async () => {
    renderWithStore(<Watchlist selected={null} onSelect={noop} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add pairs' }));
    await screen.findByRole('button', { name: 'Add USD/CHF to the watchlist' });

    await userEvent.type(screen.getByRole('searchbox', { name: /filter pairs/i }), 'zar');

    expect(screen.queryByRole('button', { name: /Add USD\/CHF/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add USD\/ZAR/ })).toBeInTheDocument();
  });

  it('explains an empty watchlist', async () => {
    server.use(
      http.get('http://localhost:8000/rates/latest', () =>
        HttpResponse.json({ rates: [], count: 0 }),
      ),
    );

    renderWithStore(<Watchlist selected={null} onSelect={noop} />);

    await waitFor(() => expect(screen.getByText(/nothing on the watchlist/i)).toBeInTheDocument());
  });
});
