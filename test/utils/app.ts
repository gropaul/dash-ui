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
 * Load the app connected to DuckDB, with the welcome tour suppressed. Call once at
 * the start of a test.
 *
 * `origin` is prefixed onto the navigation URL: leave it empty for web (relative
 * to the config `baseURL`); pass the dev-server origin for Electron, whose window
 * has no `baseURL`.
 *
 * `api` is the connection query - `api=wasm`, or `api=http&url=<server>` for the
 * dash extension's HTTP API, the same handoff `PRAGMA dash` performs. The app saves
 * the connection to its history, so later plain reloads reconnect without it. In
 * Electron the params are ignored (it always uses its native DuckDB backend), so the
 * value is a harmless no-op there.
 *
 * Both values come from the `appOrigin` / `appApi` fixtures.
 */
export async function openApp(page: Page, origin = '', api = 'api=wasm'): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('dash-onboarding-seen', 'true');
  });
  await page.goto(`${origin}/?${api}`);
  await expectAppReady(page);
}
