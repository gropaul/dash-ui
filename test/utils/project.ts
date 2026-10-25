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
 * The name a query's file gets: an identifier, as the new-query dialog saves it (`Range Query` → `range_query`).
 * The file tree shows queries by it.
 */
export function queryFileStem(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
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
  await expect(page).toHaveURL(new RegExp(`/workspace/${queryFileStem(name)}\\.sql$`));
  return page.url();
}

/** Go to the bare workspace, the welcome screen. */
export async function goToWorkspaceRoot(page: Page): Promise<void> {
  // Sidebar entries are <a> elements without href (client-side nav), so they are
  // not exposed as links; match by text like `goToProjectsList` does.
  await page.getByText('Workspace', { exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/workspace$/);
}

export type FileKind = 'Page' | 'Query' | 'Folder';

/**
 * Create a page, query or folder from the file tree: the + menu of the "Files" header for the top level, or the
 * context menu of `folder` (its name in the tree). A new page or query opens; returns the URL then.
 */
export async function createEntity(page: Page, kind: FileKind, name: string, folder?: string): Promise<string> {
  if (folder) {
    await treeItem(page, folder).click({ button: 'right' });
  } else {
    await fileTree(page).getByRole('button', { name: 'New', exact: true }).click();
  }
  await page.getByRole('menuitem', { name: `New ${kind.toLowerCase()}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `New ${kind}` });
  await dialog.getByRole('textbox', { name: 'Enter a name' }).fill(name);
  await dialog.getByRole('button', { name: 'Create' }).click();
  if (kind === 'Folder') {
    await expect(dialog).toBeHidden();
    return page.url();
  }
  await expect(page).toHaveURL(/\/projects\/[^/]+\/workspace\/.+\.(md|sql)$/);
  return page.url();
}

/** The sidebar's file tree. */
export function fileTree(page: Page) {
  return page.getByRole('tree', { name: 'Files' });
}

/** A file or folder in the file tree by the name it shows (a query's file name, a page's name). */
export function treeItem(page: Page, name: string) {
  return fileTree(page).getByRole('treeitem', { name, exact: true });
}

/** Open a folder in the file tree, if it is closed. */
export async function expandFolder(page: Page, name: string): Promise<void> {
  const folder = treeItem(page, name);
  if (await folder.getAttribute('aria-expanded') !== 'true') await folder.click();
  await expect(folder).toHaveAttribute('aria-expanded', 'true');
}

/** Move a file or folder through its context menu's "Move to…" picker; `target` is a folder path or 'Top level'. */
export async function moveTo(page: Page, name: string, target: string): Promise<void> {
  await treeItem(page, name).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Move to…' }).click();
  await page.getByRole('option', { name: new RegExp(`^${target.split('/').pop()}\\b`) }).first().click();
}

/** The workspace's file paths, read from the store (e2e builds only). */
export async function workspacePaths(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const store = (window as unknown as { __workspaceStore?: any }).__workspaceStore;
    return Object.keys(store?.getState().files ?? {}).sort();
  });
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

/** Open a query by the name it was created with, from the file tree. */
export async function openQuery(page: Page, name: string): Promise<void> {
  await treeItem(page, queryFileStem(name)).click();
  await expect(page).toHaveURL(new RegExp(`/workspace/(.+/)?${queryFileStem(name)}\\.sql$`));
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
  const projectName = opts.projectName ?? 'E2E Test Project';
  const queryName = opts.queryName ?? 'Test Query';
  const sql = opts.sql ?? 'SELECT * FROM range(10)';

  await createProject(page, projectName);
  const queryUrl = await createQuery(page, queryName);
  await setSql(page, sql);
  await runQuery(page);

  return { projectName, queryName, sql, queryUrl };
}
