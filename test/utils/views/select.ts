import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Select-view helpers. Switch a relation to it with `selectResultView(page, 'Select')`.
 *
 * A Select relation renders a dropdown of the distinct values of its first column,
 * and its table macro (`dash.refs.<name>()`) filters on whatever is picked - so the
 * picked value flows into every relation that references it.
 */

/** The Select view's dropdown trigger, scoped to a container (e.g. a single dashboard widget). */
export function selectTrigger(scope: Page | Locator): Locator {
  return scope.getByRole('combobox');
}

/**
 * Click a value in the dropdown and close it again - it stays open after a click,
 * covering whatever sits below it. The trigger lives inside `scope`, but the option
 * list is portaled to the body, so options are looked up on the page.
 */
async function toggleSelectValue(page: Page, value: string, scope: Page | Locator): Promise<void> {
  await selectTrigger(scope).click();
  await page.getByRole('option', { name: value, exact: true }).click();
  await page.keyboard.press('Escape');
}

/** Pick a value in a Select view. */
export async function pickSelectValue(page: Page, value: string, scope: Page | Locator = page): Promise<void> {
  await toggleSelectValue(page, value, scope);
  await expect(selectTrigger(scope)).toContainText(value);
}

/** Clear a single-select's pick - clicking the picked value again toggles it off. */
export async function clearSelectValue(page: Page, value: string, scope: Page | Locator = page): Promise<void> {
  await toggleSelectValue(page, value, scope);
  await expect(selectTrigger(scope)).toContainText('Select...');
}
