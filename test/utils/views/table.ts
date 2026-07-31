import { expect, type Page } from '@playwright/test';

/** Table-view helpers. */

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

/** The first data row of the table (skips the header row group). */
export function firstDataRow(page: Page) {
  return page.getByRole('rowgroup').last().getByRole('row').first();
}

/** Assert the first data row of the table contains the given text. */
export async function expectFirstDataRow(page: Page, text: string): Promise<void> {
  await expect(firstDataRow(page)).toContainText(text);
}
