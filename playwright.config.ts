
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Single worker: the app coordinates one DuckDB/OPFS session per origin, so
  // concurrent browsers contend over the same OPFS files ("Access Handles cannot
  // be created if there is another open") and flake. Tests must run serially.
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // Exposes the dev-only __relationsStore hook (see relations.state.ts) that the
    // test helpers use to await state propagation. Note: if a plain `pnpm dev` is
    // already running, Playwright reuses it and this env is NOT applied - stop it
    // first so the e2e server starts with the flag.
    env: { NEXT_PUBLIC_E2E: '1' },
  },
});