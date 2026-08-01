// seed: test/seed.shared.spec.ts
// Runs on both runtimes (web + electron); see test/fixtures.ts.
import { test, expect } from './fixtures';
import { DASH_CATALOG_STATE, DASH_REFS_SCHEMA } from '@/platform/global-data';
import {
  addRelationWidget,
  clearSelectValue,
  createEntity,
  createProjectWithQuery,
  expectFirstDataRow,
  expectRowCount,
  goToWorkspaceRoot,
  openApp,
  pickSelectValue,
  runQuery,
  selectResultView,
  setSql,
  widgetWith,
  widgetWithout,
} from './utils';

/**
 * Two relations wired together through a table macro, driven from a dashboard.
 *
 * "Numbers" (range(10), shown as a Select) is referenced by "Filtered" through the
 * macro Dash registers per relation. A Select relation's macro filters on the picked
 * value, so picking 4 in the dashboard's Numbers widget must narrow the Filtered
 * widget to the single row 4 - the cross-widget interaction under test.
 */
// Built from the catalog constants rather than hardcoded, so a renamed alias does not
// silently turn this into a test of an error message. Mirrors getMacroName(), which
// cannot be imported here (table-macros pulls in browser-only modules).
const NUMBERS_MACRO = `${DASH_CATALOG_STATE}.${DASH_REFS_SCHEMA}.numbers`;

test.describe('Relation references on a dashboard', () => {
  test('picking a value in a Select relation filters the relation referencing it', async ({ app: page, appOrigin }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin);

    // 1. The upstream relation: 10 rows, displayed as a dropdown.
    await createProjectWithQuery(page, {
      projectName: 'E2E Reference Test',
      queryName: 'Numbers',
      sql: 'SELECT * FROM range(10)',
    });
    await expectRowCount(page, 10);
    await selectResultView(page, 'Select');
    await expect(page.getByRole('combobox').filter({ hasText: 'Select...' })).toBeVisible();

    // 2. The downstream relation: references Numbers by its table macro. With nothing
    //    selected upstream the macro passes all 10 rows through.
    await goToWorkspaceRoot(page);
    await createEntity(page, 'Query', 'Filtered');
    await setSql(page, `SELECT * FROM ${NUMBERS_MACRO}()`);
    await runQuery(page);
    await expectRowCount(page, 10);

    // 3. Put both on one dashboard.
    await goToWorkspaceRoot(page);
    await createEntity(page, 'Dashboard', 'Overview');
    await addRelationWidget(page, 'Numbers');
    await addRelationWidget(page, 'Filtered');

    // Filtered is the widget showing a table, Numbers the other one. (Not "the widget
    // with a combobox" - a table's own footer has a page-size combobox too.)
    const filteredWidget = widgetWith(page, page.getByRole('table'));
    const numbersWidget = widgetWithout(page, page.getByRole('table'));
    await expect(numbersWidget).toHaveCount(1);
    await expect(filteredWidget).toHaveCount(1);
    await expectRowCount(filteredWidget, 10);

    // 4. The interaction: pick 4 upstream, and the downstream widget narrows to it.
    await pickSelectValue(page, '4', numbersWidget);
    await expectRowCount(filteredWidget, 1);
    await expectFirstDataRow(filteredWidget, '4');

    // 5. Clearing the selection restores all rows - the filter follows the pick.
    await clearSelectValue(page, '4', numbersWidget);
    await expectRowCount(filteredWidget, 10);
  });
});
