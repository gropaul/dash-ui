import { expect, type Page } from '@playwright/test';

/** Chart-view helpers. Switch to it first with `selectResultView(page, 'Chart')`. */

export type ChartAxis = 'X-Axis' | 'Y-Axis' | 'Group';

/**
 * Assign a column to a chart axis. Each axis dropdown keeps its selected item
 * mounted after closing, so an earlier matching option can linger in the DOM;
 * the just-opened popover is appended last, so target the last match.
 */
export async function setChartColumn(page: Page, axis: ChartAxis, column: string): Promise<void> {
  await page.getByRole('combobox').filter({ hasText: axis }).click();
  await page.getByRole('option', { name: column }).last().click();
}

/** Assert a bar chart is rendered (type "Bar" + an ECharts instance on screen). */
export async function expectBarChartVisible(page: Page): Promise<void> {
  await expect(page.getByRole('combobox').filter({ hasText: 'Bar' })).toBeVisible();
  // ECharts tags its root node with this attribute once it has rendered.
  await expect(page.locator('[_echarts_instance_]')).toBeVisible();
}
