import { expect, type Page } from '@playwright/test';
import { SQL_EDITOR_CODE_CHANGE_DEBOUNCE_MS } from '@/platform/global-data';

/**
 * Helpers for the per-project Connections tab (`sources.sql`) and the Catalog view it feeds.
 */

/** The navigation sidebar; scoped so labels can't collide with the breadcrumb nav. */
function sidebar(page: Page) {
  return page.locator('nav').filter({ hasText: 'All projects' });
}

export async function goToConnections(page: Page): Promise<void> {
  await sidebar(page).getByText('Connections', { exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/connections$/);
}

export async function goToCatalog(page: Page): Promise<void> {
  await sidebar(page).getByText('Catalog', { exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/data$/);
}

/**
 * Write the project's `sources.sql` and replay it. Resolves once the manifest is in the projects
 * store and the replay has finished (the save button is enabled again).
 *
 * Monaco's textarea is not fillable, so the model value is set directly - which fires the editor's
 * change event, exactly as typing would. Like `setSql`, the edit is retried: `@monaco-editor/react`
 * subscribes to changes in an effect just after mount, so a one-shot setValue can land in that gap
 * and be dropped, and the save would then store an empty manifest. The manifest lives in the
 * projects store (not the relation state), so that store is what we wait on - saving twice is
 * harmless, a replay reconciles rather than appends.
 */
export async function setProjectSources(page: Page, sql: string, timeout = 120_000): Promise<void> {
  await goToConnections(page);
  await page.getByRole('button', { name: 'sources.sql' }).click();
  await page.waitForFunction(() => {
    const m = (window as unknown as { monaco?: any }).monaco;
    return !!m?.editor?.getEditors?.().some((e: any) => e.getModel()?.uri.toString().includes('sql-editor'));
  });

  const save = page.getByRole('button', { name: 'Save & re-attach' });
  await expect(async () => {
    await page.evaluate((value) => {
      const monaco = (window as unknown as { monaco: any }).monaco;
      const editor = monaco.editor
        .getEditors()
        .find((e: any) => e.getModel()?.uri.toString().includes('sql-editor'));
      const model = editor.getModel();
      if (model.getValue() === value) model.setValue('');
      model.setValue(value);
    }, sql);
    // the editor hands its value up on a debounce
    await page.waitForTimeout(4 * SQL_EDITOR_CODE_CHANGE_DEBOUNCE_MS);

    await expect(save).toBeEnabled();
    await save.click();
    await expectProjectSources(page, sql, 5_000);
  }).toPass({ timeout: 30_000 });

  // attaching a remote database downloads it, so allow well over the default timeout
  await expect(save).toBeEnabled({ timeout });
}

/** Wait until the current project's manifest equals `sql` (see the __projectsStore e2e hook). */
async function expectProjectSources(page: Page, sql: string, timeout: number): Promise<void> {
  await page.waitForFunction((expected) => {
    const store = (window as unknown as { __projectsStore?: any }).__projectsStore;
    return store?.getState().getCurrentProject()?.sourcesSql === expected;
  }, sql, { timeout });
}

/** Assert the catalog lists (or doesn't list) a table of the given name. */
export async function expectCatalogTable(page: Page, name: string, visible: boolean): Promise<void> {
  const cell = page.getByRole('cell', { name, exact: true });
  if (visible) {
    await expect(cell).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(cell).toHaveCount(0);
  }
}
