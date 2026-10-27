import fs from 'node:fs';
import path from 'node:path';
import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import {
  E2E_BASE_URL,
  E2E_DASH_HOME_DIR,
  E2E_DATA_DIR,
  E2E_DUCKDB_DIR,
  E2E_ELECTRON_PROFILE_DIR,
} from '../playwright.config';
import { dashBinariesConfigured, startDashServer, type DashServer } from './dash-server';

/**
 * Cross-runtime test fixtures: run the same spec against the web app (Chromium
 * hitting the dev server), the Electron desktop app, and a DuckDB CLI serving the
 * `dash` extension's HTTP API.
 *
 * A spec written against these fixtures is runtime-agnostic. Destructure the
 * page as `{ app: page }` so the body and every `Page` helper stay identical:
 *
 *   import { test, expect } from './fixtures';
 *   test('...', async ({ app: page, appOrigin, appApi }) => {
 *     await openApp(page, appOrigin, appApi);
 *     // ...same steps for every runtime
 *   });
 *
 * The `metadata.target` on each project (see playwright.config.ts) selects the
 * branch. Shared specs use the `*.shared.spec.ts` suffix so the Electron and http
 * projects can run only them (the web project runs everything).
 */

type Target = 'web' | 'electron' | 'http';

interface AppFixtures {
  /** The page under test: a Chromium tab (web/http) or the Electron BrowserWindow. */
  app: Page;
  /**
   * Origin to prefix absolute navigations with. Empty for web (relative paths
   * resolve against the config `baseURL`); the dev-server origin for Electron,
   * whose window has no `baseURL`.
   */
  appOrigin: string;
  /**
   * Query string that tells the app which backend to connect to, the same handoff
   * `PRAGMA dash` uses when it opens `http://localhost:4200/?api=http` (see
   * `parseConnectionParams` in src/components/provider/config-utils.ts). Pass it on the
   * first navigation of a test; the app saves the connection to its history, so later
   * reloads reconnect without it.
   *
   * `api=wasm` for web, `api=http&url=<server>` for the http target. Electron ignores
   * it - the desktop app always uses its native backend - but passing it is harmless.
   */
  appApi: string;
}

/** The CLI-backed dash server, for the http target only. */
interface ServerFixture {
  dashServer: DashServer | null;
}

function targetOf(testInfo: { project: { metadata: Record<string, unknown> } }): Target {
  const target = testInfo.project.metadata.target;
  return target === 'electron' || target === 'http' ? target : 'web';
}

export const test = base.extend<AppFixtures & ServerFixture>({
  appOrigin: async ({}, use, testInfo) => {
    await use(targetOf(testInfo) === 'electron' ? E2E_BASE_URL : '');
  },

  // Starts a DuckDB CLI running the dash extension's HTTP server for the http target,
  // and nothing at all for the others.
  dashServer: async ({}, use, testInfo) => {
    if (targetOf(testInfo) !== 'http') {
      await use(null);
      return;
    }
    test.skip(!dashBinariesConfigured(), 'set E2E_DUCKDB_BIN and E2E_DASH_EXTENSION');
    const server = await startDashServer(E2E_DASH_HOME_DIR);
    await use(server);
    await server.stop();
  },

  appApi: async ({ dashServer }, use) => {
    await use(dashServer ? `api=http&url=${encodeURIComponent(dashServer.url)}` : 'api=wasm');
  },

  app: async ({ page, dashServer }, use, testInfo) => {
    if (targetOf(testInfo) === 'http') {
      // duckdb-over-http: an ordinary Chromium tab on the dev server. The backend is chosen
      // by the `appApi` query the spec puts on its first navigation, not here.
      void dashServer;
      await use(page);
      return;
    }

    if (targetOf(testInfo) === 'web') {
      // Reuse Playwright's built-in page so baseURL / trace / video from the
      // config `use` block still apply.
      await use(page);
      return;
    }

    // Electron: launch the real desktop app pointed at the same dev server the
    // web tests use. isElectron() still resolves true (Chromium adds the
    // "Electron" token to the UA), so the app runs its NATIVE DuckDB backend -
    // the desktop path we actually want to test - while inheriting the dev
    // server's NEXT_PUBLIC_E2E hooks that the test helpers depend on.
    //
    // Both halves of its persistent state are redirected into a throwaway data dir:
    // the DuckDB files (DASH_STORAGE_DIR, read by electron/duckdb.cjs) and the
    // Chromium profile holding localStorage (--user-data-dir). Without these the run
    // would start on whatever the previous run - or the developer's own desktop app -
    // left behind.
    //
    // The dir is wiped per test, not per run, so each test (and each RETRY) gets a
    // first-launch app, matching the web target where every test gets a fresh OPFS.
    // Wiping once per run is not enough: tests create projects under fixed names, so
    // a retry would hit "a project with this name already exists" and could never
    // recover. Safe to do here only because `workers: 1` rules out a concurrent app.
    fs.rmSync(E2E_DATA_DIR, { recursive: true, force: true });
    //
    // On Linux the Chromium sandbox has to be turned off. CI runners block unprivileged
    // user namespaces, so Chromium falls back to the setuid helper - and the Electron
    // that npm installs ships `chrome-sandbox` without the root-owned 4755 bits it
    // needs, which aborts the launch ("The SUID sandbox helper binary was found, but is
    // not configured correctly"). Other platforms keep the sandbox on.
    const linuxArgs = process.platform === 'linux' ? ['--no-sandbox'] : [];
    const electronApp: ElectronApplication = await electron.launch({
      args: ['.', `--user-data-dir=${E2E_ELECTRON_PROFILE_DIR}`, ...linuxArgs],
      env: {
        ...process.env,
        ELECTRON_START_URL: E2E_BASE_URL,
        DASH_STORAGE_DIR: E2E_DUCKDB_DIR,
        DASH_HEADLESS: '1',
        // The agent chat runs this echo agent instead of any agent installed on the machine.
        DASH_E2E_AGENT: path.resolve('test/agents/echo-agent.mjs'),
      } as Record<string, string>,
    });
    const window = await electronApp.firstWindow();
    await use(window);
    await electronApp.close();
  },
});

export { expect } from '@playwright/test';
