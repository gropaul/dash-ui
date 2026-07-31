import { expect, type Page } from '@playwright/test';

/**
 * App-shell helpers: getting the Dash app into a ready, connected state.
 *
 * On localhost a fresh profile does not auto-connect to DuckDB and shows a
 * connection dialog, and a first-run welcome tour modal blocks interaction.
 * These helpers side-step both the same way the seed test does.
 */

/** Wait until the app shell is ready: DuckDB connected and init complete. */
export async function expectAppReady(page: Page): Promise<void> {
  // The top-bar Settings button only mounts once init reaches 'complete'.
  // Cold DuckDB WASM init is slower on CI, so allow generous time.
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible({ timeout: 45_000 });
}

/**
 * Load the app connected to DuckDB, with the welcome tour suppressed. On web,
 * `?api=wasm` auto-establishes the WASM connection (and saves it to history, so
 * later plain reloads reconnect without the param). In Electron the URL params
 * are ignored - the app always uses its native DuckDB backend - so the param is
 * a harmless no-op there. Call once at the start of a test.
 *
 * `origin` is prefixed onto the navigation URL: leave it empty for web (relative
 * to the config `baseURL`); pass the dev-server origin for Electron, whose
 * window has no `baseURL`. Both values are supplied by the `appOrigin` fixture.
 */
export async function openApp(page: Page, origin = ''): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('dash-onboarding-seen', 'true');
  });
  await page.goto(`${origin}/?api=wasm`);
  await expectAppReady(page);
}
