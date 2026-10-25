
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// The e2e suite runs its own dev server on a dedicated port so it never collides
// with (or silently reuses) a `pnpm dev` on the default 3000 - that server lacks
// NEXT_PUBLIC_E2E and the test helpers would fail on the missing hooks. Override
// with E2E_PORT if 3100 is taken too.
const PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = `http://localhost:${PORT}`;

// Throwaway state for the Electron runtime, wiped by test/fixtures.ts before every test
// so both targets start from an empty app. Unlike the web target - whose OPFS dies with
// the browser context - the desktop app persists: its DuckDB files default to
// ~/.duckdb/extension_data/dash and its Chromium profile to the OS app-data dir, both
// shared with a locally-run app. So each is redirected in here (DASH_STORAGE_DIR /
// --user-data-dir, wired up in test/fixtures.ts).
const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const E2E_DATA_DIR = path.join(ROOT, '.e2e-data');
export const E2E_DUCKDB_DIR = path.join(E2E_DATA_DIR, 'duckdb');
export const E2E_ELECTRON_PROFILE_DIR = path.join(E2E_DATA_DIR, 'electron-profile');

// The duckdb-over-http target runs a real DuckDB CLI with the `dash` extension loaded
// (`CALL start_dash(...)`, what `PRAGMA dash` expands to). It needs two binaries that are
// not part of this repo, supplied by env:
//   E2E_DUCKDB_BIN       path to a duckdb CLI matching the extension's DuckDB version
//   E2E_DASH_EXTENSION   path to dash.duckdb_extension (the file must be named dash.*,
//                        DuckDB derives the entrypoint symbol from the basename)
// The extension keeps its state in $HOME/.duckdb/extension_data/dash, so each test gets a
// throwaway HOME under E2E_DASH_HOME_DIR.
export const E2E_DUCKDB_BIN = process.env.E2E_DUCKDB_BIN;
export const E2E_DASH_EXTENSION = process.env.E2E_DASH_EXTENSION;
export const E2E_DASH_PORT = Number(process.env.E2E_DASH_PORT ?? 4200);
export const E2E_DASH_HOME_DIR = path.join(E2E_DATA_DIR, 'dash-home');

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
  // A locally built (debug) dash extension is far slower than a release binary; raise this to give
  // project loads room. Default matches Playwright's own.
  expect: { timeout: Number(process.env.E2E_EXPECT_TIMEOUT ?? 5000) },
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // Web: runs every spec in a Chromium tab against the dev server.
    {
      name: 'web',
      metadata: { target: 'web' },
      use: { ...devices['Desktop Chrome'] },
    },
    // Electron: launches the desktop app (native DuckDB) pointed at the same dev
    // server. Runs only cross-runtime specs (the `*.shared.spec.ts` suffix); the
    // fixture in test/fixtures.ts branches on metadata.target.
    {
      name: 'electron',
      metadata: { target: 'electron' },
      testMatch: '**/*.shared.spec.ts',
    },
    // duckdb-over-http: a Chromium tab against the same dev server, but with the app's
    // database connection pointed at a DuckDB CLI running the `dash` extension's HTTP
    // server. Same spec set as Electron.
    {
      name: 'http',
      metadata: { target: 'http' },
      testMatch: '**/*.shared.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    env: {
      // Exposes the dev-only __workspaceStore hook (see workspace/workspace.state.ts) that the
      // test helpers use to await state propagation.
      NEXT_PUBLIC_E2E: '1',
      // Own dist dir, so this server does not fight a plain `pnpm dev` over Next's
      // per-dist-dir dev lock (see next.config.mjs).
      NEXT_DIST_DIR: '.next-e2e',
    },
  },
});
