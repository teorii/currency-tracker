import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithStore } from '../test/renderWithStore';
import { server, usdEurHistory } from '../test/server';
import { paddedDomain, summarise } from '../lib/chart';
import RateChart from './RateChart';

describe('RateChart', () => {
  it('leads with the latest rate and the change over the period', async () => {
    renderWithStore(<RateChart base="USD" target="EUR" />);

    expect(await screen.findByText('0.8610')).toBeInTheDocument();
    expect(screen.getByText('+0.12%')).toBeInTheDocument();
  });

  it('shows the high, low and quote count for the range', async () => {
    renderWithStore(<RateChart base="USD" target="EUR" />);

    await screen.findByText('0.8610');
    const stats = screen.getByText('H').closest('dl');
    expect(stats).toHaveTextContent('H0.8630');
    expect(stats).toHaveTextContent('L0.8600');
    expect(stats).toHaveTextContent('Quotes3');
  });

  it('requests a range that ends now and spans the chosen period', async () => {
    const seen: URL[] = [];
    server.use(
      http.get('http://localhost:8000/rates/history', ({ request }) => {
        seen.push(new URL(request.url));
        return HttpResponse.json(usdEurHistory);
      }),
    );

    renderWithStore(<RateChart base="USD" target="EUR" />);
    await screen.findByText('0.8610');

    await userEvent.click(screen.getByRole('button', { name: '1D' }));

    await waitFor(() => expect(seen).toHaveLength(2));
    const params = seen[1].searchParams;
    const start = Date.parse(params.get('start') ?? '');
    const end = Date.parse(params.get('end') ?? '');
    expect(end - start).toBe(24 * 60 * 60 * 1000);
    expect(Date.now() - end).toBeLessThan(5_000);
  });

  it('marks the active period', async () => {
    renderWithStore(<RateChart base="USD" target="EUR" />);

    expect(await screen.findByRole('button', { name: '1W' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '3M' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('explains an empty range rather than drawing nothing', async () => {
    server.use(
      http.get('http://localhost:8000/rates/history', () =>
        HttpResponse.json({ ...usdEurHistory, history: [], count: 0 }),
      ),
    );

    renderWithStore(<RateChart base="USD" target="EUR" />);

    expect(await screen.findByText(/no quotes for USD\/EUR/i)).toBeInTheDocument();
  });

  it('reports a failed request', async () => {
    server.use(
      http.get(
        'http://localhost:8000/rates/history',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderWithStore(<RateChart base="USD" target="EUR" />);

    expect(await screen.findByText(/could not load history/i)).toBeInTheDocument();
  });
});

describe('RateChart export', () => {
  it('links to a csv of exactly the range on screen', async () => {
    renderWithStore(<RateChart base="USD" target="EUR" />);
    await screen.findByText('0.8610');

    const link = screen.getByRole('link', { name: 'CSV' });
    const url = new URL(link.getAttribute('href') ?? '');

    expect(url.pathname).toBe('/rates/history.csv');
    expect(url.searchParams.get('base')).toBe('USD');
    expect(url.searchParams.get('target')).toBe('EUR');
    const span = Date.parse(url.searchParams.get('end') ?? '') - Date.parse(url.searchParams.get('start') ?? '');
    expect(span).toBe(7 * 24 * 60 * 60 * 1000);
    expect(link).toHaveAttribute('download');
  });

  it('is inert when there is nothing to download', async () => {
    server.use(
      http.get('http://localhost:8000/rates/history', () =>
        HttpResponse.json({ ...usdEurHistory, history: [], count: 0 }),
      ),
    );
    renderWithStore(<RateChart base="USD" target="EUR" />);
    await screen.findByText(/no quotes for/i);

    expect(screen.getByRole('link', { name: 'CSV' })).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('summarise', () => {
  it('reads first, last, high and low from the points', () => {
    const summary = summarise([
      { at: 1, rate: 0.9 },
      { at: 2, rate: 0.95 },
      { at: 3, rate: 0.88 },
      { at: 4, rate: 0.92 },
    ]);

    expect(summary).toEqual({
      first: 0.9,
      last: 0.92,
      high: 0.95,
      low: 0.88,
      change: expect.closeTo((0.92 - 0.9) / 0.9, 10),
    });
  });

  it('has no change to report from a single point', () => {
    expect(summarise([{ at: 1, rate: 0.9 }])?.change).toBeNull();
  });

  it('is null for no points', () => {
    expect(summarise([])).toBeNull();
  });
});

describe('paddedDomain', () => {
  it('pads real movement by a fixed fraction of its span', () => {
    const [low, high] = paddedDomain({ first: 1, last: 1.1, high: 1.1, low: 1, change: 0.1 });

    expect(high - low).toBeCloseTo(0.1 * 1.3, 10);
    expect(low).toBeLessThan(1);
    expect(high).toBeGreaterThan(1.1);
  });

  it('never lets rounding noise fill the plot', () => {
    // A pegged pair: the two quotes differ in the sixth decimal place.
    const [low, high] = paddedDomain({
      first: 3.672498,
      last: 3.672504,
      high: 3.672504,
      low: 3.672498,
      change: 0,
    });

    // The floor is a fraction of the rate, far wider than the six-millionths of movement.
    expect(high - low).toBeGreaterThan(3.67 * 0.002);
    expect(high - low).toBeLessThan(3.67 * 0.004);
  });
});
