import { expect, type Locator, type Page } from '@playwright/test';

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
 * Assert how many rows the table holds, read off its footer ("1 to N of N").
 * The rendered rows themselves are virtualized (and padded with spacer `<tr>`s),
 * so the footer is the reliable count. A narrow footer drops the " of N" half,
 * hence only the "1 to N" prefix is matched.
 */
export async function expectRowCount(scope: Page | Locator, count: number): Promise<void> {
  await expect(scope.getByText(new RegExp(`\\b1 to ${count}\\b`))).toBeVisible();
}
