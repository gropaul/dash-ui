import { type Page } from '@playwright/test';
import { STORAGE_THROTTLE_TIME_MS } from '@/platform/global-data';
import { expectAppReady } from './app';
import { goToProjectsList, openProject, openQuery, type QueryContext } from './project';

/**
 * Persistence harness: verify some piece of query state survives every way a
 * query can be re-entered.
 */

/**
 * Wait for the relation state to be flushed to the project's DuckDB storage.
 * Saves are autosaved on a trailing throttle (STORAGE_THROTTLE_TIME_MS); waiting
 * 2x guarantees the latest edits are on disk before a reload / reopen restores
 * from storage.
 */
export async function waitForPersist(page: Page): Promise<void> {
  await page.waitForTimeout(2 * STORAGE_THROTTLE_TIME_MS);
}

/**
 * Assert that `assert` still holds after each of the three ways a query is
 * re-entered:
 *   A. a full page reload,
 *   B. navigating back to the projects list and reopening the project + query,
 *   C. opening the query by its direct URL.
 * Flushes pending saves first so the reload restores the latest state.
 */
export async function expectPersistsAcrossReloadReopenAndUrl(
  page: Page,
  ctx: QueryContext,
  assert: (page: Page) => Promise<void>,
): Promise<void> {
  await waitForPersist(page);

  // A - reload
  await page.reload();
  await expectAppReady(page);
  await assert(page);

  // B - back to the projects list, then reopen the project and the query
  await goToProjectsList(page);
  await openProject(page, ctx.projectName);
  await openQuery(page, ctx.queryName);
  await assert(page);

  // C - open the query directly by its URL
  await page.goto(ctx.queryUrl);
  await expectAppReady(page);
  await assert(page);
}
