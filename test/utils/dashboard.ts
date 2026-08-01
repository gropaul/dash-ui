import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Dashboard helpers: adding widgets and addressing them individually.
 *
 * Widgets carry no name in the DOM (the embedded relation view renders no header),
 * so tests address them by what they contain - see `widgetWith`.
 */

/** The dashboard's widget tiles (react-grid-layout items). */
export function dashboardWidgets(page: Page): Locator {
  return page.locator('.react-grid-item');
}

/**
 * The widget containing `content`, e.g. `widgetWith(page, page.getByRole('table'))`
 * for the one showing a table.
 */
export function widgetWith(page: Page, content: Locator): Locator {
  return dashboardWidgets(page).filter({ has: content });
}

/** The widget *not* containing `content` - the counterpart of `widgetWith`. */
export function widgetWithout(page: Page, content: Locator): Locator {
  return dashboardWidgets(page).filter({ hasNot: content });
}

/**
 * Add an existing relation to the open dashboard. Uses the toolbar's "Add widget"
 * entry point, which opens the global command palette filtered to relations.
 * Requires edit mode (the default for a dashboard).
 */
export async function addRelationWidget(page: Page, relationName: string): Promise<void> {
  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByRole('option', { name: relationName }).click();
}
