// Electron only: the agent chat runs agents as local processes. The e2e agent echoes each prompt back
// (test/agents/echo-agent.mjs), so the prompt is the agent's reply.
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { createEntity, createProject, expectChartIn, expectRowCount, openApp, readFile, setSql } from './utils';

async function reply(page: Page, text: string) {
  const input = page.getByPlaceholder('Ask the agent…');
  await input.fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(input).toHaveValue('');
  return page.locator('[data-agent-message]').last();
}

test.describe('Agent chat blocks', () => {
  test('an agent message shows its data fences as blocks and runs only reading SQL', async ({ app: page, appOrigin, appApi }, testInfo) => {
    test.skip(testInfo.project.metadata.target !== 'electron', 'only the desktop app runs agents');
    test.setTimeout(120_000);

    await openApp(page, appOrigin, appApi);
    await createProject(page, 'E2E Agent Chat');
    await createEntity(page, 'Folder', 'Sales');
    await createEntity(page, 'Query', 'Orders', 'Sales');
    await setSql(page, 'SELECT * FROM range(4) t(n)');
    await expect.poll(() => readFile(page, 'Sales/orders.sql')).toContain('range(4)');
    await page.getByRole('button', { name: 'Agent chat', exact: true }).click();
    await expect(page.getByPlaceholder('Ask the agent…')).toBeEnabled({ timeout: 30_000 });

    const table = await reply(page, 'Three rows:\n\n```sql\n-- view: table\nSELECT * FROM range(3) t(n)\n```');
    await expectRowCount(table, 3);
    await expect(table).toContainText('Three rows');

    // A message that starts with a block shows it edge to edge, its text below.
    const chart = await reply(page, '```sql\n-- view: bar\n-- x: k\n-- y: v\nSELECT * FROM (VALUES (\'a\', 1), (\'b\', 2)) t(k, v)\n```\nTwo bars.');
    await expectChartIn(chart);
    await expect(chart.locator(':scope > [data-chat-block]')).toHaveCount(1);
    await expect(chart).toContainText('Two bars.');

    const write = await reply(page, '```sql\n-- view: table\nCREATE TABLE t AS SELECT 1 AS x\n```');
    await expect(write).toContainText('Only reading statements');
    const tables = await reply(page, '```sql\n-- view: table\nSELECT count(*) AS n FROM information_schema.tables WHERE table_name = \'t\'\n```');
    await expectRowCount(tables, 1);
    await expect(tables.getByRole('cell').last()).toHaveText('0');

    // A block takes a query file in by its path from the project root, and reads query files through refs.
    await expectRowCount(await reply(page, '```sql\n-- input: Sales/orders.sql\n-- view: table\n```'), 4);
    await expectRowCount(await reply(page, '```sql\n-- view: table\nSELECT * FROM refs.orders() WHERE n < 2\n```'), 2);

    const code = await reply(page, 'Just code:\n\n```sql\nSELECT 42\n```');
    await expect(code.locator('[data-chat-block]')).toHaveCount(0);
    await expect(code).toContainText('SELECT 42');
  });
});
