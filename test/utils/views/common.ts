import { type Page } from '@playwright/test';

/** Shared across all result views: switching the "Display as" view. */

export type ResultView = 'Table' | 'Chart' | 'Text' | 'Select' | 'Slider';

/** Switch the result view (the "Display as" toolbar). */
export async function selectResultView(page: Page, view: ResultView): Promise<void> {
  await page.getByRole('button', { name: view, exact: true }).click();
}
