import { expect, type Page } from '@playwright/test';

/** Chart-view helpers. Switch to it first with `selectResultView(page, 'Chart')`. */

export type ChartAxis = 'X-Axis' | 'Y-Axis' | 'Group';

/**
 * Assign a column to a chart axis. Each axis dropdown keeps its selected item
 * mounted after closing, so an earlier matching option can linger in the DOM;
 * the just-opened popover is appended last, so target the last match.
 *
 * Opening and picking are retried as one unit: a re-render (the app still settles
 * its route after the query runs) can tear the popover down mid-click, and once the
 * option is detached its dropdown has closed with it - so retrying the option click
 * alone can never succeed. The axis label lives in the trigger permanently, not just
 * while unset, so the combobox is still findable after a partially applied attempt.
 */
export async function setChartColumn(page: Page, axis: ChartAxis, column: string): Promise<void> {
  await expect(async () => {
    await page.getByRole('combobox').filter({ hasText: axis }).click();
    await page.getByRole('option', { name: column }).last().click({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
}

/** Assert a bar chart is rendered (type "Bar" + an ECharts instance on screen). */
export async function expectBarChartVisible(page: Page): Promise<void> {
  await expect(page.getByRole('combobox').filter({ hasText: 'Bar' })).toBeVisible();
  // ECharts tags its root node with this attribute once it has rendered.
  await expect(page.locator('[_echarts_instance_]')).toBeVisible();
}
