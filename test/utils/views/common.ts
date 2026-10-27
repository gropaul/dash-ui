import { expect, type Page } from '@playwright/test';

/** Shared across all result views: switching the "Display as" view. */

export type ResultView = 'Table' | 'Chart' | 'Text' | 'Select' | 'Slider';

/** Switch the result view (the "Display as" toolbar). */
export async function selectResultView(page: Page, view: ResultView): Promise<void> {
  await page.getByRole('button', { name: view, exact: true }).click();
}

/** The References tab of the open query's config panel, opened. */
export function referencesTab(page: Page) {
  return page.getByRole('tabpanel', { name: 'References' });
}

/** Open the References tab and assert the section `title` ('Used by', 'Uses', 'Pages') lists exactly `names`. */
export async function expectReferences(page: Page, title: string, names: string[]): Promise<void> {
  await page.getByRole('tab', { name: 'References' }).click();
  // The innermost element holding both the section's title and its entries.
  const section = referencesTab(page).locator('div')
    .filter({ has: page.getByText(title, { exact: true }) }).filter({ has: page.getByRole('button') }).last();
  // An entry may carry a detail after its name, e.g. 'block'.
  await expect(section.getByRole('button')).toHaveText(names.map((name) => new RegExp(`^${name}`)));
}
