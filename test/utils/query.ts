import { expect, type Page } from '@playwright/test';

/**
 * Query-editor helpers: driving the Monaco SQL editor and its execution.
 */

/**
 * Wait until an edit has committed to the relation store, i.e. some relation's
 * `query.baseQuery` equals `sql`. The editor commits on a debounce, and every
 * relation edit replaces the whole relation from a React snapshot - so we must
 * let the commit land before the next edit, or it clones a stale snapshot and
 * clobbers the query. Relies on the dev-only `__relationsStore` hook exposed in
 * `src/state/relations.state.ts`.
 */
export async function waitForBaseQueryCommitted(page: Page, sql: string, timeout = 10_000): Promise<void> {
  await page.waitForFunction((expected) => {
    const store = (window as unknown as { __relationsStore?: any }).__relationsStore;
    if (!store) return false;
    const relations = Object.values(store.getState().relations ?? {});
    return relations.some((r: any) => r?.query?.baseQuery === expected);
  }, sql, { timeout });
}

/**
 * Replace the SQL editor contents and wait for the change to commit to the
 * store. Monaco's textarea is not fillable and its select-all is unreliable
 * under automation, so we set the model value directly (which fires Monaco's
 * change event, exactly as typing would).
 *
 * The edit is applied inside a retry loop: `@monaco-editor/react` wires its
 * onChange subscription in an effect just after the editor mounts, so on a slow
 * (CI) machine a one-shot setValue can land in that gap and be dropped, leaving
 * the query uncommitted. We first wait for the editor *instance* to exist (proof
 * onMount ran), then re-apply until the commit actually reaches the store - each
 * attempt clears the model first so a freshly-attached subscription sees a real
 * change even when the target text is unchanged.
 */
export async function setSql(page: Page, sql: string): Promise<void> {
  await page.waitForFunction(() => {
    const m = (window as unknown as { monaco?: any }).monaco;
    return !!m?.editor?.getEditors?.().some((e: any) => e.getModel()?.uri.toString().includes('sql-editor'));
  });
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
    await waitForBaseQueryCommitted(page, sql, 2_000);
  }).toPass({ timeout: 20_000 });
}

/**
 * Run the query via the editor's own "run-code" action, which uses the live
 * editor value (the on-screen "Run Query" button runs the relation's committed
 * query, which lags the editor by a debounce).
 */
export async function runQuery(page: Page): Promise<void> {
  await page.evaluate(() => {
    const monaco = (window as unknown as { monaco: any }).monaco;
    const editor = monaco.editor
      .getEditors()
      .find((e: any) => e.getModel()?.uri.toString().includes('sql-editor'));
    editor.getAction('run-code').run();
  });
}

/** Assert the SQL editor shows the given query text. */
export async function expectSql(page: Page, sql: string): Promise<void> {
  await expect(page.locator('.monaco-editor[data-uri*="sql-editor"]')).toContainText(sql);
}
