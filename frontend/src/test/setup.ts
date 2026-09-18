import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './server';

// Unhandled requests error rather than pass through, so a test that reaches
// for an endpoint nobody stubbed says so instead of hanging.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  window.history.replaceState(null, '', '/');
});
afterAll(() => server.close());
