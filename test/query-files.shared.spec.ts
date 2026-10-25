// seed: test/seed.shared.spec.ts
// Runs on both runtimes (web + electron); see test/fixtures.ts.
import { test, expect } from './fixtures';
import {
  addQueryBlock,
  createEntity,
  expectReferences,
  referencesTab,
  createProject,
  expectCatalogTable,
  expectFirstDataRow,
  expectRowCount,
  goToCatalog,
  openApp,
  readFile,
  runQuery,
  setProjectSources,
  setSql,
  treeItem,
  workspacePaths,
} from './utils';

/** Queries as `.sql` files: reading each other, renaming and deleting them, saving one from the catalog. */
test.describe('Query files', () => {
  test('a query reads another through refs, and a rename rewrites the call', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Query Refs');
    await createEntity(page, 'Query', 'Orders');
    await setSql(page, 'SELECT * FROM range(5)');
    await runQuery(page);
    await expectRowCount(page, 5);

    await createEntity(page, 'Query', 'Summary');
    await setSql(page, 'SELECT count(*) AS n FROM refs.orders()');
    await runQuery(page);
    await expectFirstDataRow(page, '5');

    // The References tab of each shows the other, and an entry opens it.
    await expectReferences(page, 'Uses', ['orders']);
    await treeItem(page, 'orders').click();
    await expectReferences(page, 'Used by', ['summary']);
    await referencesTab(page).getByRole('button', { name: 'summary' }).click();
    await expect(page).toHaveURL(/\/workspace\/summary\.sql$/);

    // The rename dialog says where the query is used, and the call follows the new name.
    await treeItem(page, 'orders').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rename' });
    await expect(dialog).toContainText('summary.sql');
    await dialog.getByRole('textbox', { name: 'Enter a name' }).fill('Purchases');
    await dialog.getByRole('button', { name: 'Rename' }).click();
    await expect.poll(() => workspacePaths(page)).toEqual(['purchases.sql', 'summary.sql']);
    await expect.poll(() => readFile(page, 'summary.sql')).toContain('refs.purchases()');

    // And the query still runs against the renamed one.
    await treeItem(page, 'summary').click();
    await runQuery(page);
    await expectFirstDataRow(page, '5');
  });

  test('deleting a query a page uses names the page, and its block shows the query as not found', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Delete Used');
    await createEntity(page, 'Query', 'Orders');
    await setSql(page, 'SELECT * FROM range(5)');
    await createEntity(page, 'Page', 'Overview');
    await addQueryBlock(page, 'orders');
    await expect.poll(() => readFile(page, 'Overview.md')).toContain('-- input: orders.sql');

    await treeItem(page, 'orders').click();
    await expectReferences(page, 'Pages', ['Overview']);

    await treeItem(page, 'orders').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete file' });
    await expect(dialog).toContainText('Overview.md');
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect.poll(() => workspacePaths(page)).toEqual(['Overview.md']);

    await treeItem(page, 'Overview').click();
    await expect(page.getByText('orders.sql not found')).toBeVisible();
  });

  test('a table found in the catalog is saved as a query', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(180_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Save As');
    await setProjectSources(page, 'CREATE OR REPLACE TABLE memory.numbers AS SELECT * FROM range(3);');
    await goToCatalog(page);
    await expectCatalogTable(page, 'numbers', true);
    await page.getByRole('cell', { name: 'numbers', exact: true }).click();

    await page.getByRole('button', { name: 'Save as query' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Save as query' });
    await expect(dialog.getByRole('textbox', { name: 'Enter a name' })).toHaveValue('numbers');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(page).toHaveURL(/\/workspace\/numbers\.sql$/);
    expect(await workspacePaths(page)).toEqual(['numbers.sql']);
    await runQuery(page);
    await expectRowCount(page, 3);
  });
});
