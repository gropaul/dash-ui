// seed: test/seed.shared.spec.ts
// Runs on both runtimes (web + electron); see test/fixtures.ts.
import { test, expect } from './fixtures';
import {
  clearSelectValue,
  createEntity,
  createProject,
  expectFirstDataRow,
  expectReferences,
  openBlockView,
  expectRowCount,
  openApp,
  pickSelectValue,
  readFile,
  widgetWith,
  widgetWithout,
  writeFile,
} from './utils';

/**
 * Two blocks of one page wired together: "numbers" (range(10), shown as a Select) is read by "filtered" through
 * `refs.numbers()`, which is expanded with the block's pick when "filtered" runs. Picking 4 must narrow
 * "filtered" to the single row 4.
 */
const PAGE = `# Overview

\`\`\`sql numbers
-- view: select
-- column: range
SELECT * FROM range(10)
\`\`\`

\`\`\`sql filtered
-- view: table
SELECT * FROM refs.numbers()
\`\`\`
`;

test.describe('Page blocks reading each other', () => {
  test('picking a value in a Select block filters the block reading it', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Block Refs');
    await createEntity(page, 'Page', 'Overview');
    // The page's text as a file edited outside the editor would arrive.
    await writeFile(page, 'Overview.md', PAGE);

    // "filtered" is the block showing a table, "numbers" the other one. (Not "the block with a combobox" - a
    // table's own footer has a page-size combobox too.)
    const filteredBlock = widgetWith(page, page.getByRole('table'));
    const numbersBlock = widgetWithout(page, page.getByRole('table'));
    await expect(numbersBlock).toHaveCount(1);
    await expect(filteredBlock).toHaveCount(1);
    await expectRowCount(filteredBlock, 10);

    // Pick 4 upstream, and the block reading it narrows to it.
    await pickSelectValue(page, '4', numbersBlock);
    await expectRowCount(filteredBlock, 1);
    await expectFirstDataRow(filteredBlock, '4');

    // Clearing the pick restores all rows.
    await clearSelectValue(page, '4', numbersBlock);
    await expectRowCount(filteredBlock, 10);

    // Each block's References tab names the other block of the page.
    await openBlockView(page, filteredBlock);
    await expectReferences(page, 'Uses', ['numbers']);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await openBlockView(page, numbersBlock);
    await expectReferences(page, 'Used by', ['filtered']);
  });

  test('renaming a block rewrites the refs to it, and the block reading it still runs', async ({ app: page, appOrigin, appApi }) => {
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Block Rename');
    await createEntity(page, 'Page', 'Overview');
    await writeFile(page, 'Overview.md', PAGE);

    const filteredBlock = widgetWith(page, page.getByRole('table'));
    const numbersBlock = widgetWithout(page, page.getByRole('table'));
    await expectRowCount(filteredBlock, 10);
    await pickSelectValue(page, '4', numbersBlock);
    await expectRowCount(filteredBlock, 1);

    // A block's rename button is in its full view, on hovering its title.
    await openBlockView(page, numbersBlock);
    const view = page.getByRole('dialog');
    await view.getByRole('heading', { level: 5 }).hover();
    await view.getByRole('button', { name: 'Rename' }).click();
    const rename = page.getByRole('dialog', { name: 'Rename block' });
    await rename.getByRole('textbox').fill('digits');
    await rename.getByRole('button', { name: 'Rename' }).click();
    await expect(rename).toBeHidden();
    await expect(view).toHaveAccessibleName('digits');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await expect.poll(() => readFile(page, 'Overview.md')).toContain('FROM refs.digits()');
    // The pick moved with the block, and the block reading it runs with the new name.
    await expectRowCount(filteredBlock, 1);
    await expectFirstDataRow(filteredBlock, '4');
    await clearSelectValue(page, '4', numbersBlock);
    await expectRowCount(filteredBlock, 10);
  });
});
