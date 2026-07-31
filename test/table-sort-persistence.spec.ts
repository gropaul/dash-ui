// seed: test/seed.spec.ts
import { test } from '@playwright/test';
import {
  openApp,
  createProjectWithQuery,
  sortColumn,
  expectFirstDataRow,
  expectPersistsAcrossReloadReopenAndUrl,
} from './utils';

test.describe('Table sort persistence', () => {
  test('a table sort order persists across reload, navigation, and direct URL', async ({ page }) => {
    test.setTimeout(90_000);

    await openApp(page);
    const ctx = await createProjectWithQuery(page, {
      projectName: 'E2E Sort Test',
      queryName: 'Range Query',
      sql: 'SELECT * FROM range(10)',
    });

    // range(10) is naturally ascending (first row is 0). Sort descending so the
    // first row becomes 9 - a visible, assertable change.
    await sortColumn(page, 'range', 'DESC');
    await expectFirstDataRow(page, '9');

    // The descending sort survives reload, reopen, and direct URL.
    await expectPersistsAcrossReloadReopenAndUrl(page, ctx, async (p) => {
      await expectFirstDataRow(p, '9');
    });
  });
});
