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
});
