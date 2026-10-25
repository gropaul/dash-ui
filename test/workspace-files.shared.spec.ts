// seed: test/seed.shared.spec.ts
// Runs on both runtimes (web + electron); see test/fixtures.ts.
import { test, expect } from './fixtures';
import {
  addQueryBlock,
  createEntity,
  createProject,
  expandFolder,
  expectAppReady,
  goToWorkspaceRoot,
  moveTo,
  openApp,
  readFile,
  treeItem,
  waitForPersist,
  workspacePaths,
} from './utils';

/** The file tree: creating, moving, renaming and deleting files and folders, and what follows them. */
test.describe('Workspace files', () => {
  test('files are created in folders and moved in and out through "Move to…"', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Files');

    await createEntity(page, 'Folder', 'Reports');
    await createEntity(page, 'Page', 'Sales', 'Reports');
    await expect(page).toHaveURL(/\/workspace\/Reports\/Sales\.md$/);
    await createEntity(page, 'Query', 'Orders');
    expect(await workspacePaths(page)).toEqual(['Reports/Sales.md', 'orders.sql']);

    // Into the folder, and the open query follows.
    await moveTo(page, 'orders', 'Reports');
    await expect.poll(() => workspacePaths(page)).toEqual(['Reports/Sales.md', 'Reports/orders.sql']);
    await expect(page).toHaveURL(/\/workspace\/Reports\/orders\.sql$/);

    // Back out to the top level, also when one folder holds everything.
    await moveTo(page, 'Sales', 'Top level');
    await moveTo(page, 'Sales', 'Reports');
    await moveTo(page, 'orders', 'Top level');
    await expect.poll(() => workspacePaths(page)).toEqual(['Reports/Sales.md', 'orders.sql']);

    // The tree's layout survives a reload.
    await waitForPersist(page);
    await page.reload();
    await expectAppReady(page);
    await expect.poll(() => workspacePaths(page)).toEqual(['Reports/Sales.md', 'orders.sql']);
    await expandFolder(page, 'Reports');
    await expect(treeItem(page, 'Sales')).toBeVisible();
    await expect(treeItem(page, 'orders')).toBeVisible();

    // The project's name in the app bar leads back to its overview.
    await goToWorkspaceRoot(page);
    await expect(page.getByText('New Query', { exact: true })).toBeVisible();
  });

  test('dragging moves a file into a folder and back to the top level', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Drag');
    await createEntity(page, 'Folder', 'Reports');
    await createEntity(page, 'Query', 'Orders');

    // Onto the middle of the folder: into it.
    await treeItem(page, 'orders').dragTo(treeItem(page, 'Reports'));
    await expect.poll(() => workspacePaths(page)).toEqual(['Reports/orders.sql']);

    // Onto the top edge of the top-level folder, the only item left at the top level: above it, out of it.
    await expandFolder(page, 'Reports');
    await treeItem(page, 'orders').dragTo(treeItem(page, 'Reports'), { targetPosition: { x: 40, y: 2 } });
    await expect.poll(() => workspacePaths(page)).toEqual(['orders.sql']);
  });

  test('moving and renaming a query rewrites the blocks taking it in', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E References');
    await createEntity(page, 'Folder', 'Data');
    await createEntity(page, 'Query', 'Orders');
    await createEntity(page, 'Page', 'Overview');
    await addQueryBlock(page, 'orders');
    await expect.poll(() => readFile(page, 'Overview.md')).toContain('-- input: orders.sql');

    await moveTo(page, 'orders', 'Data');
    await expect.poll(() => readFile(page, 'Overview.md')).toContain('-- input: Data/orders.sql');

    await expandFolder(page, 'Data');
    await treeItem(page, 'orders').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rename' });
    await dialog.getByRole('textbox', { name: 'Enter a name' }).fill('Purchases');
    await expect(dialog.getByText('purchases.sql')).toBeVisible();
    await dialog.getByRole('button', { name: 'Rename' }).click();
    await expect.poll(() => workspacePaths(page)).toEqual(['Data/purchases.sql', 'Overview.md']);
    await expect.poll(() => readFile(page, 'Overview.md')).toContain('-- input: Data/purchases.sql');
  });

  test('deleting a folder removes everything in it', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Delete');
    await createEntity(page, 'Folder', 'Old');
    await createEntity(page, 'Page', 'Notes', 'Old');
    await createEntity(page, 'Query', 'Keep');

    await treeItem(page, 'Old').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: 'Delete folder' }).getByRole('button', { name: 'Delete' }).click();
    await expect.poll(() => workspacePaths(page)).toEqual(['keep.sql']);
    await expect(treeItem(page, 'Old')).toHaveCount(0);
  });
});
