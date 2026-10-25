import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Dashboard helpers: adding relation blocks and addressing them individually.
 *
 * Blocks carry no name in the DOM (the embedded relation view renders no header),
 * so tests address them by what they contain - see `widgetWith`.
 */

/** The dashboard's relation blocks. */
export function dashboardWidgets(page: Page): Locator {
  return page.locator('[data-relation-block]');
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
 * Add an existing relation to the open dashboard, below its last block. Uses the add menu of the
 * + strip shown under a hovered block, whose "Existing relation…" tile opens the global command
 * palette filtered to relations. Requires edit mode (the default for a dashboard).
 */
export async function addRelationWidget(page: Page, relationName: string): Promise<void> {
  await page.locator('[data-slate-editor] > *').last().hover();
  await page.getByRole('button', { name: 'Add a block below' }).last().click();
  await page.getByRole('option', { name: 'Existing relation…' }).click();
  await page.getByRole('option', { name: relationName }).click();
}
