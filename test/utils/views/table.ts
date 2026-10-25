import { expect, type Locator, type Page } from '@playwright/test';
import { TABLE_FOOTER_MIN_ROWS } from '@/platform/global-data';

/**
 * Table-view helpers.
 *
 * The read helpers take a `scope` instead of a `Page` so they also work on a
 * table embedded in a container (e.g. a single dashboard widget); pass the page
 * when the table is the only one on screen.
 */

/**
 * Sort a table column. Clicking a column header cycles none -> ASC -> DESC, so
 * we click once for ASC and twice for DESC (from an unsorted column).
 */
export async function sortColumn(page: Page, column: string, direction: 'ASC' | 'DESC'): Promise<void> {
  const header = page.getByRole('columnheader', { name: column }).getByRole('button', { name: column });
  await header.click();
  if (direction === 'DESC') {
    await header.click();
  }
}

/** The data rows of the table (skips the header row group). */
export function dataRows(scope: Page | Locator): Locator {
  return scope.getByRole('rowgroup').last().getByRole('row');
}

/** The first data row of the table (skips the header row group). */
export function firstDataRow(scope: Page | Locator): Locator {
  return dataRows(scope).first();
}

/** Assert the first data row of the table contains the given text. */
export async function expectFirstDataRow(scope: Page | Locator, text: string): Promise<void> {
  await expect(firstDataRow(scope)).toContainText(text);
}

/**
 * Assert how many rows the table holds. A result shown whole below TABLE_FOOTER_MIN_ROWS rows has no footer and
 * renders every row, so those rows are counted. Larger ones are virtualized (padded with spacer `<tr>`s), so the
 * footer ("1 to N of N") is the count; a narrow footer drops the " of N" half, hence only "1 to N" is matched.
 */
export async function expectRowCount(scope: Page | Locator, count: number): Promise<void> {
  if (count < TABLE_FOOTER_MIN_ROWS) {
    const page = 'page' in scope && typeof scope.page === 'function' ? scope.page() : scope as Page;
    await expect(dataRows(scope).filter({ has: page.getByRole('cell') })).toHaveCount(count);
  } else {
    await expect(scope.getByText(new RegExp(`\\b1 to ${count}\\b`))).toBeVisible();
  }
}
