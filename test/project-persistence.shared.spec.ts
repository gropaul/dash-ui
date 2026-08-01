// seed: test/seed.shared.spec.ts
// Runs on both runtimes (web + electron); see test/fixtures.ts.
import { test, expect } from './fixtures';
import {
  openApp,
  createProjectWithQuery,
  selectResultView,
  setChartColumn,
  expectBarChartVisible,
  expectSql,
  expectPersistsAcrossReloadReopenAndUrl,
} from './utils';

test.describe('Project persistence', () => {
  test('a bar chart persists across reload, navigation, and direct URL', async ({ app: page, appOrigin }) => {
    test.setTimeout(90_000);

    await openApp(page, appOrigin);
    const ctx = await createProjectWithQuery(page, {
      projectName: 'E2E Persist Test',
      queryName: 'Range Query',
      sql: 'SELECT * FROM range(10)',
    });

    // The query ran: 10 rows (range 0..9).
    await expect(page.getByText('1 to 10 of 10')).toBeVisible();

    // Turn it into a bar chart of the single "range" column.
    await selectResultView(page, 'Chart');
    await setChartColumn(page, 'X-Axis', 'range');
    await setChartColumn(page, 'Y-Axis', 'range');
    await expectBarChartVisible(page);

    // The SQL and the bar chart survive reload, reopen, and direct URL.
    await expectPersistsAcrossReloadReopenAndUrl(page, ctx, async (p) => {
      await expectSql(p, 'SELECT * FROM range(10)');
      await expectBarChartVisible(p);
    });
  });
});
