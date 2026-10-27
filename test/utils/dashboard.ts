import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page helpers: adding relation blocks, addressing them individually, and reading or writing a page's text.
 *
 * Blocks carry no name in the DOM (the embedded relation view renders no header),
 * so tests address them by what they contain - see `widgetWith`.
 */

/** The dashboard's relation blocks. */
export function dashboardWidgets(page: Page): Locator {
  return page.locator('[data-relation-block]');
}

/**
 * The widget containing `content`, e.g. `widgetWith(page, page.getByRole('table'))`
 * for the one showing a table.
 */
export function widgetWith(page: Page, content: Locator): Locator {
  return dashboardWidgets(page).filter({ has: content });
}

/** The widget *not* containing `content` - the counterpart of `widgetWith`. */
export function widgetWithout(page: Page, content: Locator): Locator {
  return dashboardWidgets(page).filter({ hasNot: content });
}

/**
 * Add a block taking in an existing query file to the open page, below its last block. Uses the add menu of the
 * + strip shown under a hovered block, whose "Existing query…" tile opens the command palette filtered to
 * queries. `queryName` is the query's file name without `.sql`. Requires edit mode (the default for a page).
 */
export async function addQueryBlock(page: Page, queryName: string): Promise<void> {
  await page.locator('[data-slate-editor] > *').last().hover();
  await page.getByRole('button', { name: 'Add a block below' }).last().click();
  await page.getByRole('option', { name: 'Existing query…' }).click();
  await page.getByRole('option', { name: new RegExp(`^${queryName}\\b`) }).first().click();
}

/** Replace the text of the workspace file at `path` through the store (e2e builds only), as an outside edit would. */
export async function writeFile(page: Page, path: string, text: string): Promise<void> {
  await page.evaluate(([p, t]) => {
    const store = (window as unknown as { __workspaceStore?: any }).__workspaceStore;
    return store.getState().write(p, t);
  }, [path, text]);
}

/** The text of the workspace file at `path` (e2e builds only). */
export async function readFile(page: Page, path: string): Promise<string | undefined> {
  return page.evaluate((p) => (window as unknown as { __workspaceStore?: any }).__workspaceStore?.getState().files[p], path);
}

/**
 * Add a block below the page's last block from the add menu. `group` is the menu's section ('Data' for tables,
 * charts and other views; 'Text' for text, headings, lists); `label` the entry, e.g. 'Chart' or 'Text'.
 */
export async function addBlock(page: Page, group: 'Data' | 'Text', label: string): Promise<void> {
  await page.locator('[data-slate-editor] > *').last().hover();
  await page.getByRole('button', { name: 'Add a block below' }).last().click();
  await page.getByRole('group', { name: group }).getByRole('option', { name: label, exact: true }).click();
}

/** Change a relation block's view through the "Turn into" menu of its toolbar, e.g. to 'Chart'. */
export async function turnBlockInto(page: Page, block: Locator, label: string): Promise<void> {
  await block.hover({ position: { x: 4, y: 4 } });
  const draggable = page.locator('[data-draggable-id]').filter({ has: block }).last();
  await draggable.getByRole('button', { name: 'Turn into' }).click();
  await page.getByRole('option', { name: label, exact: true }).click();
  await expect(page.getByRole('option', { name: label, exact: true })).toBeHidden();
}

/** Open a relation block's full view (the "Open view" button of its toolbar), a dialog with its config panel. */
export async function openBlockView(page: Page, block: Locator): Promise<void> {
  await block.hover({ position: { x: 4, y: 4 } });
  await page.locator('[data-draggable-id]').filter({ has: block }).last().getByRole('button', { name: 'Open view' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
