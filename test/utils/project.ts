import { expect, type Page } from '@playwright/test';
import { runQuery, setSql } from './query';

/**
 * Project + workspace navigation helpers, and a one-call "starter" that gives a
 * test a project with a runnable query so view-specific tests don't rebuild it.
 */

export interface QueryContext {
  projectName: string;
  queryName: string;
  sql: string;
  /** Direct URL of the created query, for the open-by-URL persistence path. */
  queryUrl: string;
}

function uniqueName(base: string): string {
  return `${base} ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a project from the projects list and land inside its workspace. */
export async function createProject(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/workspace$/);
  await expect(page.getByRole('button', { name: `Open ${name}` })).toBeVisible();
}

/**
 * Create a query from the fresh-project welcome screen and open it. Returns the
 * query's direct URL.
 */
export async function createQuery(page: Page, name: string): Promise<string> {
  await page.getByText('New Query', { exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New Query' });
  await dialog.getByRole('textbox', { name: 'Enter a name' }).fill(name);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/workspace\/[^/]+$/);
  return page.url();
}

/** Go to the project's workspace root - the folder view listing every entity. */
export async function goToWorkspaceRoot(page: Page): Promise<void> {
  // Sidebar entries are <a> elements without href (client-side nav), so they are
  // not exposed as links; match by text like `goToProjectsList` does.
  await page.getByText('Workspace', { exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/workspace$/);
}

/**
 * Create an entity from the workspace folder view's "New" menu. Creating opens the
 * new entity, so the returned URL is its own. Requires the workspace root (see
 * `goToWorkspaceRoot`); the fresh-project welcome screen uses `createQuery`.
 */
export async function createEntity(page: Page, kind: 'Query' | 'Dashboard' | 'Canvas', name: string): Promise<string> {
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByRole('menuitem', { name: kind, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `New ${kind}` });
  await dialog.getByRole('textbox', { name: 'Enter a name' }).fill(name);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/workspace\/[^/]+$/);
  return page.url();
}

/** Go back to the projects list. */
export async function goToProjectsList(page: Page): Promise<void> {
  // The sidebar "All projects" entry is an <a> without href (client-side nav),
  // so it is not exposed as a link role; match it by text.
  await page.getByText('All projects', { exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
}

/** Open a project by name from the projects list. */
export async function openProject(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/workspace$/);
}

/** Open a query by name from the project workspace overview. */
export async function openQuery(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name }).click();
  await expect(page).toHaveURL(/\/workspace\/[^/]+$/);
}

/**
 * Starter: create a project, add a query, set its SQL and run it. Assumes the
 * app is already open on the projects list (see `openApp`). Returns the context
 * needed to drive persistence checks.
 */
export async function createProjectWithQuery(
  page: Page,
  opts: { projectName?: string; queryName?: string; sql?: string } = {},
): Promise<QueryContext> {
  const projectName = uniqueName(opts.projectName ?? 'E2E Test Project');
  const queryName = uniqueName(opts.queryName ?? 'Test Query');
  const sql = opts.sql ?? 'SELECT * FROM range(10)';

  await createProject(page, projectName);
  const queryUrl = await createQuery(page, queryName);
  await setSql(page, sql);
  await runQuery(page);

  return { projectName, queryName, sql, queryUrl };
}
