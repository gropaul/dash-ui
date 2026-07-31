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
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible({ timeout: 30_000 });
}

/**
 * Load the app connected to DuckDB WASM, with the welcome tour suppressed.
 * `?api=wasm` auto-establishes the connection (and saves it to history, so later
 * plain reloads reconnect without the param). Call once at the start of a test.
 */
export async function openApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('dash-onboarding-seen', 'true');
  });
  await page.goto('/?api=wasm');
  await expectAppReady(page);
}
