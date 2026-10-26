import { type Page } from '@playwright/test';
import { expectAppReady } from './app';
import { goToProjectsList, openProject, openQuery, type QueryContext } from './project';

/**
 * Persistence harness: verify some piece of query state survives every way a
 * query can be re-entered.
 */

/**
 * Wait until the workspace's changes have reached the project's folder (the app bar's save status). Editors
 * write after a pause in typing, so the wait starts once that pause is over.
 */
export async function waitForPersist(page: Page): Promise<void> {
  await page.waitForTimeout(1_000);
  await page.waitForFunction(() => {
    const status = (window as unknown as { __saveStatus?: { getState(): { status: string } } }).__saveStatus;
    return status?.getState().status === 'saved';
  });
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
