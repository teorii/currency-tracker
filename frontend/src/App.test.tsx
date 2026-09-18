import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import App from './App';
import { renderWithStore } from './test/renderWithStore';
import { server } from './test/server';

describe('App', () => {
  it('selects the first pair as soon as rates arrive', async () => {
    renderWithStore(<App />);

    // The header echoes the selection, so finding it there means it was made.
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findAllByText('USD/EUR')).not.toHaveLength(0);
  });

  it('switches to a pair the user picks', async () => {
    renderWithStore(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /^USD\/JPY/ }));

    expect(await screen.findAllByText('USD/JPY')).not.toHaveLength(0);
  });

  it('prompts for a selection when nothing is tracked', async () => {
    server.use(
      http.get('http://localhost:8000/rates/latest', () =>
        HttpResponse.json({ rates: [], count: 0 }),
      ),
    );

    renderWithStore(<App />);

    expect(await screen.findByText(/select a pair/i)).toBeInTheDocument();
  });

  describe('deep links', () => {
    it('opens on the pair named in the url instead of the first one', async () => {
      window.history.replaceState(null, '', '/?base=USD&target=JPY');

      renderWithStore(<App />);

      expect(await screen.findByRole('button', { name: /^USD\/JPY/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: /^USD\/EUR/ })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('writes the pair to the url when one is chosen', async () => {
      renderWithStore(<App />);

      await userEvent.click(await screen.findByRole('button', { name: /^USD\/JPY/ }));

      expect(window.location.search).toBe('?base=USD&target=JPY');
    });

    it('leaves the url alone when only the default pair is showing', async () => {
      renderWithStore(<App />);

      await screen.findByRole('button', { name: /^USD\/EUR/ });

      expect(window.location.search).toBe('');
    });

    it('falls back to the first pair when the url names a malformed one', async () => {
      window.history.replaceState(null, '', '/?base=DOLLAR&target=EUR');

      renderWithStore(<App />);

      expect(await screen.findByRole('button', { name: /^USD\/EUR/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });
});
