import { test, expect } from '@playwright/test';

/**
 * Seed test for the Playwright Test Agents (planner / generator / healer).
 *
 * This test runs FIRST and is the template every generated test is cloned from,
 * so its only job is to land the app in a clean, deterministic, ready-to-drive
 * state. Generated tests inherit this setup and append their own steps after the
 * "app ready" checkpoint below.
 *
 * Three things every run needs:
 *   1. Auto-connect to DuckDB WASM via the `?api=wasm` URL param. On localhost a
 *      fresh profile has no saved connection and does NOT auto-connect (autoload
 *      is only enabled on the production domain), so init otherwise parks at
 *      "Selecting connection" and force-opens the connection dialog. `?api=wasm`
 *      is the app's own deep-link to establish a working connection headlessly
 *      (see config-utils.ts / init.state.ts).
 *   2. Suppress the first-run welcome tour — a modal that otherwise opens on a
 *      fresh profile and blocks every interaction — by pre-seeding its
 *      localStorage flag before any app code runs.
 *   3. Wait for DuckDB WASM initialization to finish. Until it does, AppGate
 *      shows a "Loading..." screen instead of the app shell.
 */
test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    // 1. Skip the onboarding tour before the app boots (see onboarding.state.ts).
    await page.addInitScript(() => {
      window.localStorage.setItem('dash-onboarding-seen', 'true');
    });

    // 2. Load the app and auto-connect to DuckDB WASM. baseURL
    //    (http://localhost:3000) comes from playwright.config.ts.
    await page.goto('/?api=wasm');

    // 3. App ready: init reaches 'complete', the AppGate "Loading..." gate is
    //    replaced by the app shell, and the top-bar Settings button mounts.
    //    WASM init can take a few seconds, so allow extra time.
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible({ timeout: 30_000 });

    // generate code here.
  });
});
