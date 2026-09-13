import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithStore } from '../test/renderWithStore';
import { server } from '../test/server';
import Converter from './Converter';

describe('Converter', () => {
  it('converts the default amount at the quoted rate', async () => {
    renderWithStore(<Converter from="USD" to="EUR" />);

    expect(await screen.findByText('86.00 EUR')).toBeInTheDocument();
    expect(screen.getByText(/1 USD = 0\.8600 EUR, quoted/)).toBeInTheDocument();
  });

  it('recomputes locally as the amount changes, without another request', async () => {
    let requests = 0;
    server.use(
      http.get('http://localhost:8000/rates/convert', () => {
        requests += 1;
        return HttpResponse.json({
          base_currency: 'USD',
          target_currency: 'EUR',
          amount: 1,
          rate: 0.86,
          converted: 0.86,
          quoted_at: '2026-09-04T01:37:04Z',
          basis: 'direct',
          via: null,
        });
      }),
    );
    renderWithStore(<Converter from="USD" to="EUR" />);
    await screen.findByText('86.00 EUR');

    const amount = screen.getByRole('textbox', { name: 'Amount' });
    await userEvent.clear(amount);
    await userEvent.type(amount, '250');

    expect(await screen.findByText('215.00 EUR')).toBeInTheDocument();
    expect(requests).toBe(1);
  });

  it('says when a rate was crossed through another currency', async () => {
    renderWithStore(<Converter from="EUR" to="JPY" />);

    expect(await screen.findByText('18,143.00 JPY')).toBeInTheDocument();
    expect(screen.getByText(/via USD/)).toBeInTheDocument();
  });

  it('says when a rate was inverted', async () => {
    renderWithStore(<Converter from="EUR" to="USD" />);

    expect(await screen.findByText(/inverted/)).toBeInTheDocument();
  });

  it('swaps the two currencies', async () => {
    renderWithStore(<Converter from="USD" to="EUR" />);
    await screen.findByText('86.00 EUR');

    await userEvent.click(screen.getByRole('button', { name: 'Swap currencies' }));

    expect(screen.getByRole('combobox', { name: 'From' })).toHaveValue('EUR');
    expect(screen.getByRole('combobox', { name: 'To' })).toHaveValue('USD');
    expect(await screen.findByText(/inverted/)).toBeInTheDocument();
  });

  it('flags an amount it cannot read and shows no result', async () => {
    renderWithStore(<Converter from="USD" to="EUR" />);
    await screen.findByText('86.00 EUR');

    const amount = screen.getByRole('textbox', { name: 'Amount' });
    await userEvent.clear(amount);
    await userEvent.type(amount, 'abc');

    expect(amount).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('--'));
  });

  it('reports a pair the api cannot price', async () => {
    renderWithStore(<Converter from="USD" to="ZZZ" />);

    expect(await screen.findByText(/no rate held for USD\/ZZZ/i)).toBeInTheDocument();
  });
});
