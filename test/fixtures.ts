import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

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
    await use(targetOf(testInfo) === 'electron' ? 'http://localhost:3000' : '');
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
    const electronApp: ElectronApplication = await electron.launch({
      args: ['.'],
      env: { ...process.env, ELECTRON_START_URL: 'http://localhost:3000' } as Record<string, string>,
    });
    const window = await electronApp.firstWindow();
    await use(window);
    await electronApp.close();
  },
});

export { expect } from '@playwright/test';
