// The website's data viewer (src/web/app/data-viewer): files opened in the browser, kept in its OPFS.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { expectFirstDataRow, expectRowCount } from './utils';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

/** The twelve busiest stations of the train data, as Parquet and as CSV. */
const STATIONS = 12;

function files(page: Page) {
  return page.getByRole('complementary', { name: 'Files' });
}

async function openFile(page: Page, name: string) {
  await page.locator('input[type="file"]').setInputFiles(path.join(DATA, name));
  await expect(files(page).getByText(name)).toBeVisible();
  // The first file waits for DuckDB WASM to download and start.
  await expect(page.getByRole('table')).toBeVisible({ timeout: 60_000 });
}

function schemaColumn(page: Page, column: string) {
  return page.getByRole('list', { name: 'Columns' }).getByRole('listitem')
    .filter({ has: page.getByText(column, { exact: true }) });
}

/** The Columns tab of the side panel lists `column` with `type`. */
async function expectColumn(page: Page, column: string, type: string) {
  await expect(schemaColumn(page, column)).toContainText(type);
}

/** The Columns tab draws a chart of `column`'s values (an ECharts canvas). */
async function expectChart(page: Page, column: string) {
  await expect(schemaColumn(page, column).locator('canvas').first()).toBeVisible();
}

test.describe('Data viewer', () => {
  test('a Parquet file shows its rows and schema, and is still listed after a reload', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/parquet-viewer');
    await openFile(page, 'train-stops.parquet');

    await expectRowCount(page, STATIONS);
    await expectFirstDataRow(page, 'Utrecht Centraal');
    await expect(page.getByRole('tab', { name: 'Columns', selected: true })).toBeVisible();
    await expectColumn(page, 'stops', 'INTEGER');
    await expectColumn(page, 'first_day', 'DATE');
    // A histogram of the numbers, the top values of the text.
    await expectChart(page, 'stops');
    await expectChart(page, 'station');

    await page.reload();
    await files(page).getByText('train-stops.parquet').click();
    // DuckDB WASM starts again after the reload.
    await expect(page.getByRole('table')).toBeVisible({ timeout: 60_000 });
    await expectRowCount(page, STATIONS);
  });

  test('a value picked in the column stats filters the rows, until the filters are cleared', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/parquet-viewer');
    await openFile(page, 'train-stops.parquet');
    await expectChart(page, 'station');

    // The top values chart draws the most frequent value, all tied here, at the bottom: Utrecht Centraal, the first.
    const chart = (await schemaColumn(page, 'station').locator('canvas').first().boundingBox())!;
    await page.mouse.click(chart.x + 60, chart.y + chart.height - 14);
    await expectRowCount(page, 1);
    await expectFirstDataRow(page, 'Utrecht Centraal');
    await expect(schemaColumn(page, 'station').getByLabel('Filtered')).toBeVisible();

    await page.getByRole('button', { name: /1 filter/ }).click();
    await expectRowCount(page, STATIONS);
  });

  test('a CSV file opens with its types detected, and can be deleted', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/csv-viewer');
    await openFile(page, 'train-stops.csv');

    await expectRowCount(page, STATIONS);
    await expectFirstDataRow(page, 'Utrecht Centraal');
    await expectColumn(page, 'station', 'VARCHAR');
    await expectColumn(page, 'first_day', 'DATE');

    await files(page).getByText('train-stops.csv').hover();
    await files(page).getByRole('button', { name: 'Delete train-stops.csv', exact: true }).click();
    await expect(files(page).getByText('train-stops.csv')).toHaveCount(0);
    await expect(page.getByText('Drop a file here')).toBeVisible();

    await page.reload();
    await expect(files(page).getByText('Files you open are kept here')).toBeVisible();
  });
});
