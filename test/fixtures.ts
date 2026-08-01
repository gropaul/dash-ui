import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { E2E_BASE_URL, E2E_DUCKDB_DIR, E2E_ELECTRON_PROFILE_DIR } from '../playwright.config';

/**
 * Cross-runtime test fixtures: run the same spec against the web app (Chromium
 * hitting the dev server) and the Electron desktop app.
 *
 * A spec written against these fixtures is runtime-agnostic. Destructure the
 * page as `{ app: page }` so the body and every `Page` helper stay identical:
 *
 *   import { test, expect } from './fixtures';
 *   test('...', async ({ app: page, appOrigin }) => {
 *     await openApp(page, appOrigin);
 *     // ...same steps for both runtimes
 *   });
 *
 * The `metadata.target` on each project (see playwright.config.ts) selects the
 * branch. Shared specs use the `*.shared.spec.ts` suffix so the Electron project
 * can run only them (the web project runs everything).
 */

type Target = 'web' | 'electron';

interface AppFixtures {
  /** The page under test: a Chromium tab (web) or the Electron BrowserWindow. */
  app: Page;
  /**
   * Origin to prefix absolute navigations with. Empty for web (relative paths
   * resolve against the config `baseURL`); the dev-server origin for Electron,
   * whose window has no `baseURL`.
   */
  appOrigin: string;
}

function targetOf(testInfo: { project: { metadata: Record<string, unknown> } }): Target {
  return testInfo.project.metadata.target === 'electron' ? 'electron' : 'web';
}

export const test = base.extend<AppFixtures>({
  appOrigin: async ({}, use, testInfo) => {
    await use(targetOf(testInfo) === 'electron' ? E2E_BASE_URL : '');
  },

  app: async ({ page }, use, testInfo) => {
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
    // Both halves of its persistent state are redirected into the throwaway data dir
    // that global setup wipes: the DuckDB files (DASH_STORAGE_DIR, read by
    // electron/duckdb.cjs) and the Chromium profile holding localStorage
    // (--user-data-dir). Without these the run would start on whatever the previous
    // run - or the developer's own desktop app - left behind.
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
      } as Record<string, string>,
    });
    const window = await electronApp.firstWindow();
    await use(window);
    await electronApp.close();
  },
});

export { expect } from '@playwright/test';
