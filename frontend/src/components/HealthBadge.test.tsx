import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithStore } from '../test/renderWithStore';
import { health, server } from '../test/server';
import HealthBadge from './HealthBadge';

describe('HealthBadge', () => {
  it('reports live with the time of the newest quote', async () => {
    renderWithStore(<HealthBadge />);

    await screen.findByText('Live');
    expect(screen.getByRole('status')).toHaveTextContent(/quoted \d{1,2}:\d{2}/);
  });

  it('says so when the api holds no quotes yet', async () => {
    server.use(
      http.get('http://localhost:8000/health', () =>
        HttpResponse.json({ ...health, tracked_pairs: 0, latest_quote_at: null }),
      ),
    );

    renderWithStore(<HealthBadge />);

    expect(await screen.findByText('no quotes yet')).toBeInTheDocument();
  });

  it('treats a 503 from the health check as unreachable', async () => {
    server.use(
      http.get('http://localhost:8000/health', () =>
        HttpResponse.json({ status: 'degraded', database: 'down' }, { status: 503 }),
      ),
    );

    renderWithStore(<HealthBadge />);

    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });

  it('reports a network failure', async () => {
    server.use(http.get('http://localhost:8000/health', () => HttpResponse.error()));

    renderWithStore(<HealthBadge />);

    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });
});
