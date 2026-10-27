// seed: test/seed.shared.spec.ts
// Runs on both runtimes (web + electron); see test/fixtures.ts.
import { test, expect } from './fixtures';
import {
  addBlock,
  addQueryBlock,
  createEntity,
  createProject,
  expectAppReady,
  expectChartIn,
  expectRowCount,
  moveTo,
  openApp,
  readFile,
  setSql,
  treeItem,
  turnBlockInto,
  waitForPersist,
  writeFile,
} from './utils';

/** Building pages in the editor: blocks from the add menu, blocks taking a query in, links between pages. */
test.describe('Page editing', () => {
  test('blocks added from the menu are saved to the page and survive a reload', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Page Editing');
    await createEntity(page, 'Page', 'Report');

    await addBlock(page, 'Data', 'Table');
    const block = page.locator('[data-relation-block]');
    await expect(block.getByRole('table')).toBeVisible();

    await addBlock(page, 'Text', 'Text');
    await page.keyboard.type('Squares of x');
    await expect(page.getByText('Squares of x')).toBeVisible();

    await turnBlockInto(page, block, 'Chart');
    await expectChartIn(block);
    await expect.poll(() => readFile(page, 'Report.md')).toContain('-- view: bar');
    await expect.poll(() => readFile(page, 'Report.md')).toContain('Squares of x');

    await waitForPersist(page);
    await page.reload();
    await expectAppReady(page);
    await expectChartIn(block);
    await expect(page.getByText('Squares of x')).toBeVisible();
  });

  test('a block taking a query in shows it, and changing the block changes the page, not the query', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Input Block');
    await createEntity(page, 'Query', 'Orders');
    await setSql(page, 'SELECT * FROM range(5)');
    const query = await readFile(page, 'orders.sql');

    await createEntity(page, 'Page', 'Overview');
    await addQueryBlock(page, 'orders');
    const block = page.locator('[data-relation-block]');
    await expectRowCount(block, 5);

    await turnBlockInto(page, block, 'Chart');
    await expect.poll(() => readFile(page, 'Overview.md')).toMatch(/-- input: orders\.sql[\s\S]*-- view: \w+|-- view: \w+[\s\S]*-- input: orders\.sql/);
    expect(await readFile(page, 'orders.sql')).toBe(query);
  });

  test('a link opens the page it points to, and follows it when that page moves', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Page Links');
    await createEntity(page, 'Folder', 'Docs');
    await createEntity(page, 'Page', 'Target');
    await createEntity(page, 'Page', 'Home');
    await writeFile(page, 'Home.md', '# Home\n\nSee [Target](Target.md).\n');

    // In the page, not the file tree, which links its files too.
    const link = page.locator('[data-slate-editor]').getByRole('link', { name: 'Target', exact: true });
    await link.click();
    await expect(page).toHaveURL(/\/workspace\/Target\.md$/);

    await moveTo(page, 'Target', 'Docs');
    await expect.poll(() => readFile(page, 'Home.md')).toContain('Docs/Target.md');

    await treeItem(page, 'Home').click();
    await link.click();
    await expect(page).toHaveURL(/\/workspace\/Docs\/Target\.md$/);
  });
});
