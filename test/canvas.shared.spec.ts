// seed: test/seed.shared.spec.ts
// Runs on both runtimes (web + electron); see test/fixtures.ts.
import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  createEntity,
  createProject,
  expectAppReady,
  expectFirstDataRow,
  expectRowCount,
  openApp,
  pickSelectValue,
  readFile,
  waitForPersist,
  writeFile,
} from './utils';

/** A node of the open canvas, by its id in the `.canvas` file. */
function canvasNode(page: Page, id: string) {
  return page.locator(`.react-flow__node[data-id="${id}"]`);
}

/** A query node of a `.canvas` file: its ```sql block named `name`. */
function queryNode(id: string, x: number, name: string, header: string, sql: string, height = 440): string {
  return `<node id="${id}" type="query" x="${x}" y="0" width="360" height="${height}">\n\n`
    + `\`\`\`sql ${name}\n${header}\n${sql}\n\`\`\`\n\n</node>\n`;
}

/**
 * "numbers" (range(10)) read by "filtered" through `refs.numbers()`, with `view` as the view of "numbers". A dropdown
 * is short, so it shows above the toolbar floating at the canvas's bottom even in a small window.
 */
const twoNodes = (view: 'select' | 'table') => [
  queryNode('numbers', 0, 'numbers', `-- view: ${view}\n-- column: range`, 'SELECT * FROM range(10)', view === 'select' ? 120 : 440),
  queryNode('filtered', 440, 'filtered', '-- view: table', 'SELECT * FROM refs.numbers()'),
].join('\n');

test.describe('Canvas', () => {
  test('nodes added from the toolbar are saved to the file and come back after a reload', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Canvas Nodes');
    await createEntity(page, 'Canvas', 'Sketch');
    // A new canvas starts with its name as a heading.
    await expect(canvasNode(page, 'title')).toContainText('Sketch');

    // A text node: pick the tool, click the canvas, type.
    const pane = page.locator('.react-flow__pane');
    await page.getByRole('button', { name: 'Text', exact: true }).click();
    await pane.click({ position: { x: 120, y: 260 } });
    await page.keyboard.type('Hello canvas');
    await page.keyboard.press('Escape');

    // A query node: pick the tool, then press and release on the canvas.
    await page.getByRole('button', { name: 'Relation', exact: true }).click();
    const box = (await pane.boundingBox())!;
    await page.mouse.move(box.x + 520, box.y + 260);
    await page.mouse.down();
    await page.mouse.up();

    await expect.poll(() => readFile(page, 'Sketch.canvas')).toContain('Hello canvas');
    await expect.poll(() => readFile(page, 'Sketch.canvas')).toContain('```sql query_1');

    await waitForPersist(page);
    await page.reload();
    await expectAppReady(page);
    await expect(page.locator('.react-flow__node-textNode').filter({ hasText: 'Hello canvas' })).toBeVisible();
    await expect(page.locator('.react-flow__node-relationNode')).toHaveCount(1);
  });

  test('a node reading another through refs is linked to it and follows its pick', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Canvas Refs');
    await createEntity(page, 'Canvas', 'Flow');
    await writeFile(page, 'Flow.canvas', twoNodes('select'));

    const numbers = canvasNode(page, 'numbers');
    const filtered = canvasNode(page, 'filtered');
    // The edge follows from the refs call; nothing in the file draws it.
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await expectRowCount(filtered, 10);

    await pickSelectValue(page, '4', numbers);
    await expectRowCount(filtered, 1);
    await expectFirstDataRow(filtered, '4');
  });

  test('renaming a node rewrites the refs calls to it', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Canvas Rename');
    await createEntity(page, 'Canvas', 'Flow');
    await writeFile(page, 'Flow.canvas', twoNodes('table'));

    const numbers = canvasNode(page, 'numbers');
    await expectRowCount(numbers, 10);
    // The rename button shows on hovering the node's title.
    await numbers.getByRole('heading').first().hover();
    await numbers.getByRole('button', { name: 'Rename' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rename block' });
    await dialog.getByRole('textbox').fill('digits');
    await dialog.getByRole('button', { name: 'Rename' }).click();

    await expect.poll(() => readFile(page, 'Flow.canvas')).toContain('```sql digits');
    const text = await readFile(page, 'Flow.canvas');
    expect(text).toContain('FROM refs.digits()');
    expect(text).not.toContain('refs.numbers()');
    // Still linked, and still reading it.
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
    await expectRowCount(canvasNode(page, 'filtered'), 10);
  });

  test('an edit to the file from outside shows on the open canvas', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Canvas Outside Edit');
    await createEntity(page, 'Canvas', 'Notes');
    await expect(canvasNode(page, 'title')).toContainText('Notes');

    const text = (await readFile(page, 'Notes.canvas'))!;
    await writeFile(page, 'Notes.canvas', text.replace(/\n\nNotes\n\n/, '\n\nRenamed outside\n\n')
      + '\n' + queryNode('answer', 0, 'answer', '-- view: table', 'SELECT 42 AS answer').replace('y="0"', 'y="200"'));

    await expect(canvasNode(page, 'title')).toContainText('Renamed outside');
    await expectFirstDataRow(canvasNode(page, 'answer'), '42');
  });
});
